import { Meteor } from 'meteor/meteor';
import { Promise as MeteorPromise } from 'meteor/promise';
import Ansible from '../ansible';
import Flags from '../flags';
import Documents from '../lib/models/documents';
import Settings from '../lib/models/settings';
import { SettingType } from '../lib/schemas/setting';
import DriveClient from './gdrive-client-refresher';
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

function createDocument(name: string, type: keyof typeof MimeTypes): string {
  if (!Object.prototype.hasOwnProperty.call(MimeTypes, type)) {
    throw new Meteor.Error(400, `Invalid document type ${type}`);
  }
  checkClientOk();
  if (!DriveClient.gdrive) throw new Meteor.Error(500, 'Google integration is disabled');

  const template = Settings.findOne({ name: `gdrive.template.${type}` as any }) as undefined | SettingType & (
    { name: 'gdrive.template.document' } | { name: 'gdrive.template.spreadsheet' }
  );
  const mimeType = MimeTypes[type];

  const file = MeteorPromise.await(template ?
    DriveClient.gdrive.files.copy({
      fileId: template.value.id,
      requestBody: { name, mimeType },
    }) :
    DriveClient.gdrive.files.create({
      requestBody: { name, mimeType },
    }));

  const fileId = file.data.id!;

  MeteorPromise.await(DriveClient.gdrive.permissions.create({
    fileId,
    requestBody: { role: 'writer', type: 'anyone' },
  }));
  return fileId;
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

export function ensureDocument(puzzle: {
  _id: string,
  title: string,
  hunt: string,
}, type: keyof typeof MimeTypes = 'spreadsheet') {
  let doc = Documents.findOne({ puzzle: puzzle._id });
  if (!doc) {
    checkClientOk();

    Locks.withLock(`puzzle:${puzzle._id}:documents`, () => {
      doc = Documents.findOne({ puzzle: puzzle._id });
      if (!doc) {
        Ansible.log('Creating missing document for puzzle', {
          puzzle: puzzle._id,
        });

        const teamName = getTeamName();
        const googleDocId = createDocument(`${puzzle.title}: ${teamName}`, type);
        const newDoc = {
          hunt: puzzle.hunt,
          puzzle: puzzle._id,
          provider: 'google' as 'google',
          value: { type, id: googleDocId },
        };
        const docId = Documents.insert(newDoc);
        doc = Documents.findOne(docId)!;
      }
    });
  }

  return doc!;
}
