import { Meteor } from 'meteor/meteor';
import { Promise as MeteorPromise } from 'meteor/promise';
import { drive_v3 as drive } from 'googleapis';
import Ansible from '../ansible';
import Flags from '../flags';
import Documents from '../lib/models/documents';
import FolderPermissions from '../lib/models/folder_permissions';
import Hunts from '../lib/models/hunts';
import Settings from '../lib/models/settings';
import { SettingType } from '../lib/schemas/setting';
import DriveClient from './gdrive-client-refresher';
import ignoringDuplicateKeyErrors from './ignoringDuplicateKeyErrors';
import HuntFolders from './models/hunt_folders';
import Locks from './models/lock';
import getTeamName from './team_name';

export const MimeTypes = {
  spreadsheet: 'application/vnd.google-apps.spreadsheet',
  document: 'application/vnd.google-apps.document',
};

function checkClientOk() {
  if (!DriveClient.ready()) {
    throw new Meteor.Error(500, 'Google OAuth is not configured.');
  }

  if (Flags.active('disable.google')) {
    throw new Meteor.Error(500, 'Google integration is disabled.');
  }
}

function createFolder(name: string, parentId?: string): string {
  checkClientOk();
  if (!DriveClient.gdrive) throw new Meteor.Error(500, 'Google integration is disabled');

  const mimeType = 'application/vnd.google-apps.folder';
  const parents = parentId ? [parentId] : undefined;

  const folder = MeteorPromise.await(DriveClient.gdrive.files.create({
    requestBody: {
      name,
      mimeType,
      parents,
    },
  }));

  return folder.data.id!;
}

function createDocument(name: string, type: keyof typeof MimeTypes, parentId?: string): string {
  if (!Object.prototype.hasOwnProperty.call(MimeTypes, type)) {
    throw new Meteor.Error(400, `Invalid document type ${type}`);
  }
  checkClientOk();
  if (!DriveClient.gdrive) throw new Meteor.Error(500, 'Google integration is disabled');

  const template = Settings.findOne({ name: `gdrive.template.${type}` as any }) as undefined | SettingType & (
    { name: 'gdrive.template.document' } | { name: 'gdrive.template.spreadsheet' }
  );
  const mimeType = MimeTypes[type];
  const parents = parentId ? [parentId] : undefined;

  const file = MeteorPromise.await(template ?
    DriveClient.gdrive.files.copy({
      fileId: template.value.id,
      requestBody: { name, mimeType, parents },
    }) :
    DriveClient.gdrive.files.create({
      requestBody: { name, mimeType, parents },
    }));

  const fileId = file.data.id!;

  MeteorPromise.await(DriveClient.gdrive.permissions.create({
    fileId,
    requestBody: { role: 'writer', type: 'anyone' },
  }));
  return fileId;
}

export function moveDocument(id: string, newParentId: string): void {
  checkClientOk();
  if (!DriveClient.gdrive) throw new Meteor.Error(500, 'Google integration is disabled');

  const parents = MeteorPromise.await(DriveClient.gdrive.files.get({
    fileId: id,
    fields: 'parents',
  })).data.parents || [];

  MeteorPromise.await(DriveClient.gdrive.files.update({
    fileId: id,
    addParents: newParentId,
    removeParents: parents.join(','),
  }));
}

export function huntFolderName(huntName: string) {
  return `${huntName}: ${getTeamName()}`;
}

export function puzzleDocumentName(puzzleTitle: string) {
  return `${puzzleTitle}: ${getTeamName()}`;
}

export function renameDocument(id: string, name: string): void {
  checkClientOk();
  if (!DriveClient.gdrive) return;
  // It's unclear if this can ever return an error
  MeteorPromise.await(DriveClient.gdrive.files.update({
    fileId: id,
    requestBody: { name },
  }));
}

export function grantPermission(id: string, email: string, permission: string): void {
  checkClientOk();
  if (!DriveClient.gdrive) return;
  MeteorPromise.await(DriveClient.gdrive.permissions.create({
    fileId: id,
    sendNotificationEmail: false,
    requestBody: {
      type: 'user',
      emailAddress: email,
      role: permission,
    },
  }));
}

export function makeReadOnly(fileId: string): void {
  checkClientOk();
  const client = DriveClient.gdrive;
  if (!client) return;

  // Fetch all permissions so we can delete them
  const permissions = [] as NonNullable<drive.Schema$PermissionList['permissions']>;
  let token: string | undefined;
  for (;;) {
    const response = MeteorPromise.await(client.permissions.list({
      fileId,
      pageToken: token,
    }));
    const page = response.data;
    if (page.permissions) {
      permissions.push(...page.permissions);
    }
    const nextToken = response.data.nextPageToken;
    if (!nextToken) break;
    token = nextToken;
  }

  // Leave everyone with read-only access
  MeteorPromise.await(client.permissions.create({
    fileId,
    requestBody: { role: 'viewer', type: 'anyone' },
  }));

  // Delete any editor permissions
  permissions.forEach((permission) => {
    if (permission.id && permission.role === 'writer') {
      MeteorPromise.await(client.permissions.delete({
        fileId,
        permissionId: permission.id,
      }));
    }
  });
}

export function makeReadWrite(fileId: string): void {
  checkClientOk();
  if (!DriveClient.gdrive) return;

  MeteorPromise.await(DriveClient.gdrive.permissions.create({
    fileId,
    requestBody: { role: 'writer', type: 'anyone' },
  }));
}

export function ensureHuntFolder(hunt: { _id: string, name: string }) {
  let folder = HuntFolders.findOne(hunt._id);
  if (!folder) {
    checkClientOk();

    Locks.withLock(`hunt:${hunt._id}:folder`, () => {
      folder = HuntFolders.findOne(hunt._id);
      if (!folder) {
        Ansible.log('Creating missing folder for hunt', {
          huntId: hunt._id,
        });

        const root = Settings.findOne({ name: 'gdrive.root' }) as undefined | SettingType & { name: 'gdrive.root' };
        const folderId = createFolder(huntFolderName(hunt.name), root?.value.id);
        const huntFolderId = HuntFolders.insert({
          _id: hunt._id,
          folder: folderId,
        });
        folder = HuntFolders.findOne(huntFolderId)!;
      }
    });
  }

  return folder!.folder;
}

export function ensureHuntFolderPermission(huntId: string, userId: string, googleAccount: string) {
  const hunt = Hunts.findOneAllowingDeleted(huntId);
  if (!hunt) return;

  const folder = ensureHuntFolder(hunt);

  const perm = {
    folder,
    user: userId,
    googleAccount,
  };
  if (FolderPermissions.findOne(perm)) {
    return;
  }

  Ansible.log('Granting permissions to folder', perm);
  grantPermission(folder, googleAccount, 'reader');
  ignoringDuplicateKeyErrors(() => {
    FolderPermissions.insert(perm);
  });
}

export function ensureDocument(puzzle: {
  _id: string,
  title: string,
  hunt: string,
}, type: keyof typeof MimeTypes = 'spreadsheet') {
  const hunt = Hunts.findOneAllowingDeleted(puzzle.hunt);
  const folderId = hunt ? ensureHuntFolder(hunt) : undefined;

  let doc = Documents.findOne({ puzzle: puzzle._id });
  if (!doc) {
    checkClientOk();

    Locks.withLock(`puzzle:${puzzle._id}:documents`, () => {
      doc = Documents.findOne({ puzzle: puzzle._id });
      if (!doc) {
        Ansible.log('Creating missing document for puzzle', {
          puzzle: puzzle._id,
        });

        const googleDocId = createDocument(puzzleDocumentName(puzzle.title), type, folderId);
        const newDoc = {
          hunt: puzzle.hunt,
          puzzle: puzzle._id,
          provider: 'google' as 'google',
          value: { type, id: googleDocId, folder: folderId },
        };
        const docId = Documents.insert(newDoc);
        doc = Documents.findOne(docId)!;
      }
    });
  }

  if (doc && folderId && doc.value.folder !== folderId) {
    moveDocument(doc.value.id, folderId);
    Documents.update(doc._id, { $set: { 'value.folder': folderId } });
    doc = Documents.findOne(doc._id)!;
  }

  return doc!;
}
