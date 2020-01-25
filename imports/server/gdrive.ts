import { Meteor } from 'meteor/meteor';
import Ansible from '../ansible';
import Flags from '../flags';
import Documents from '../lib/models/documents';
import Settings from '../lib/models/settings';
import DriveClient from './gdrive-client-refresher';
import Locks from './models/lock';

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

  const template = Settings.findOne({ name: `gdrive.template.${type}` as any });
  const mimeType = MimeTypes[type];

  let file;
  if (template) {
    if (template.name !== 'gdrive.template.document' && template.name !== 'gdrive.template.spreadsheet') {
      throw new Meteor.Error(500, 'Unexpected Google Drive template document');
    }

    file = Meteor.wrapAsync(DriveClient.gdrive.files.copy, DriveClient.gdrive)({
      fileId: template.value.id,
      resource: { name, mimeType },
    });
  } else {
    file = Meteor.wrapAsync(DriveClient.gdrive.files.create, DriveClient.gdrive)({
      resource: { name, mimeType },
    });
  }

  const fileId = file.data.id;

  Meteor.wrapAsync(DriveClient.gdrive.permissions.create, DriveClient.gdrive.permissions)({
    fileId,
    resource: { role: 'writer', type: 'anyone' },
  });
  return fileId;
}

export function renameDocument(id: string, name: string): void {
  checkClientOk();
  if (!DriveClient.gdrive) return;
  // It's unclear if this can ever return an error
  Meteor.wrapAsync(DriveClient.gdrive.files.update, DriveClient.gdrive)({
    fileId: id,
    resource: { name },
  });
}

export function grantPermission(id: string, email: string, permission: string): void {
  checkClientOk();
  if (!DriveClient.gdrive) return;
  Meteor.wrapAsync(DriveClient.gdrive.permissions.create, DriveClient.gdrive.permissions)({
    fileId: id,
    sendNotificationEmail: false,
    resource: {
      type: 'user',
      emailAddress: email,
      role: permission,
    },
  });
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

        const googleDocId = createDocument(`${puzzle.title}: Death and Mayhem`, type);
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
