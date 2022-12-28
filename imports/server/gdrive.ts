import { Meteor } from 'meteor/meteor';
import { drive_v3 as drive } from '@googleapis/drive';
import Ansible from '../Ansible';
import Flags from '../Flags';
import GdriveMimeTypes, { GdriveMimeTypesType } from '../lib/GdriveMimeTypes';
import Documents from '../lib/models/Documents';
import FolderPermissions from '../lib/models/FolderPermissions';
import Hunts from '../lib/models/Hunts';
import Settings from '../lib/models/Settings';
import { SettingType } from '../lib/schemas/Setting';
import DriveClient from './gdriveClientRefresher';
import getTeamName from './getTeamName';
import ignoringDuplicateKeyErrors from './ignoringDuplicateKeyErrors';
import HuntFolders from './models/HuntFolders';
import Locks from './models/Locks';

function checkClientOk() {
  if (!DriveClient.ready()) {
    throw new Meteor.Error(500, 'Google OAuth is not configured.');
  }

  if (Flags.active('disable.google')) {
    throw new Meteor.Error(500, 'Google integration is disabled.');
  }
}

async function createFolder(name: string, parentId?: string) {
  checkClientOk();
  if (!DriveClient.gdrive) throw new Meteor.Error(500, 'Google integration is disabled');

  const mimeType = 'application/vnd.google-apps.folder';
  const parents = parentId ? [parentId] : undefined;

  const folder = await DriveClient.gdrive.files.create({
    requestBody: {
      name,
      mimeType,
      parents,
    },
  });

  return folder.data.id!;
}

async function createDocument(
  name: string,
  type: GdriveMimeTypesType,
  parentId?: string,
) {
  if (!Object.prototype.hasOwnProperty.call(GdriveMimeTypes, type)) {
    throw new Meteor.Error(400, `Invalid document type ${type}`);
  }
  checkClientOk();
  if (!DriveClient.gdrive) throw new Meteor.Error(500, 'Google integration is disabled');

  const template = (await Settings.findOneAsync({ name: `gdrive.template.${type}` as any })) as undefined | SettingType & (
    { name: 'gdrive.template.document' } | { name: 'gdrive.template.spreadsheet' }
  );
  const mimeType = GdriveMimeTypes[type];
  const parents = parentId ? [parentId] : undefined;

  const file = await (template ?
    DriveClient.gdrive.files.copy({
      fileId: template.value.id,
      requestBody: { name, mimeType, parents },
    }) :
    DriveClient.gdrive.files.create({
      requestBody: { name, mimeType, parents },
    }));

  const fileId = file.data.id!;

  await DriveClient.gdrive.permissions.create({
    fileId,
    requestBody: { role: 'writer', type: 'anyone' },
  });
  return fileId;
}

export async function moveDocument(id: string, newParentId: string) {
  checkClientOk();
  if (!DriveClient.gdrive) throw new Meteor.Error(500, 'Google integration is disabled');

  const parents = (await DriveClient.gdrive.files.get({
    fileId: id,
    fields: 'parents',
  })).data.parents ?? [];

  await DriveClient.gdrive.files.update({
    fileId: id,
    addParents: newParentId,
    removeParents: parents.join(','),
  });
}

export function huntFolderName(huntName: string) {
  return `${huntName}: ${getTeamName()}`;
}

export function puzzleDocumentName(puzzleTitle: string) {
  return `${puzzleTitle}: ${getTeamName()}`;
}

export async function renameDocument(id: string, name: string) {
  checkClientOk();
  if (!DriveClient.gdrive) return;
  // It's unclear if this can ever return an error
  await DriveClient.gdrive.files.update({
    fileId: id,
    requestBody: { name },
  });
}

export async function grantPermission(id: string, email: string, permission: string) {
  checkClientOk();
  if (!DriveClient.gdrive) return;
  await DriveClient.gdrive.permissions.create({
    fileId: id,
    sendNotificationEmail: false,
    requestBody: {
      type: 'user',
      emailAddress: email,
      role: permission,
    },
  });
}

export async function makeReadOnly(fileId: string) {
  checkClientOk();
  const client = DriveClient.gdrive;
  if (!client) return;

  // Fetch all permissions so we can delete them
  const permissions = [] as NonNullable<drive.Schema$PermissionList['permissions']>;
  let token: string | undefined;
  for (;;) {
    // eslint-disable-next-line no-await-in-loop
    const response = await client.permissions.list({
      fileId,
      pageToken: token,
    });
    const page = response.data;
    if (page.permissions) {
      permissions.push(...page.permissions);
    }
    const nextToken = response.data.nextPageToken;
    if (!nextToken) break;
    token = nextToken;
  }

  // Leave everyone with read-only access
  await client.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  // Delete any editor permissions
  await permissions.reduce(async (promise, permission) => {
    await promise;
    if (permission.id && permission.role === 'writer') {
      await client.permissions.delete({
        fileId,
        permissionId: permission.id,
      });
    }
  }, Promise.resolve());
}

export async function makeReadWrite(fileId: string) {
  checkClientOk();
  if (!DriveClient.gdrive) return;

  await DriveClient.gdrive.permissions.create({
    fileId,
    requestBody: { role: 'writer', type: 'anyone' },
  });
}

export async function ensureHuntFolder(hunt: { _id: string, name: string }) {
  let folder = await HuntFolders.findOneAsync(hunt._id);
  if (!folder) {
    checkClientOk();

    await Locks.withLock(`hunt:${hunt._id}:folder`, async () => {
      folder = await HuntFolders.findOneAsync(hunt._id);
      if (!folder) {
        Ansible.log('Creating missing folder for hunt', {
          huntId: hunt._id,
        });

        const root = await Settings.findOneAsync({ name: 'gdrive.root' }) as undefined | SettingType & { name: 'gdrive.root' };
        const folderId = await createFolder(huntFolderName(hunt.name), root?.value.id);
        const huntFolderId = await HuntFolders.insertAsync({
          _id: hunt._id,
          folder: folderId,
        });
        folder = await HuntFolders.findOneAsync(huntFolderId)!;
      }
    });
  }

  return folder!.folder;
}

export async function ensureHuntFolderPermission(
  huntId: string,
  userId: string,
  googleAccount: string,
) {
  const hunt = await Hunts.findOneAllowingDeletedAsync(huntId);
  if (!hunt) return;

  const folder = await ensureHuntFolder(hunt);

  const perm = {
    folder,
    user: userId,
    googleAccount,
  };
  if (await FolderPermissions.findOneAsync(perm)) {
    return;
  }

  Ansible.log('Granting permissions to folder', perm);
  await grantPermission(folder, googleAccount, 'reader');
  await ignoringDuplicateKeyErrors(async () => {
    await FolderPermissions.insertAsync(perm);
  });
}

export async function ensureDocument(puzzle: {
  _id: string,
  title: string,
  hunt: string,
}, type: GdriveMimeTypesType = 'spreadsheet') {
  const hunt = await Hunts.findOneAllowingDeletedAsync(puzzle.hunt);
  const folderId = hunt ? await ensureHuntFolder(hunt) : undefined;

  let doc = await Documents.findOneAsync({ puzzle: puzzle._id });
  if (!doc) {
    checkClientOk();

    await Locks.withLock(`puzzle:${puzzle._id}:documents`, async () => {
      doc = await Documents.findOneAsync({ puzzle: puzzle._id });
      if (!doc) {
        Ansible.log('Creating missing document for puzzle', {
          puzzle: puzzle._id,
        });

        const googleDocId = await createDocument(puzzleDocumentName(puzzle.title), type, folderId);
        const newDoc = {
          hunt: puzzle.hunt,
          puzzle: puzzle._id,
          provider: 'google' as const,
          value: { type, id: googleDocId, folder: folderId },
        };
        const docId = await Documents.insertAsync(newDoc);
        doc = await Documents.findOneAsync(docId)!;
      }
    });
  }

  if (doc && folderId && doc.value.folder !== folderId) {
    await moveDocument(doc.value.id, folderId);
    await Documents.updateAsync(doc._id, { $set: { 'value.folder': folderId } });
    doc = (await Documents.findOneAsync(doc._id))!;
  }

  return doc!;
}
