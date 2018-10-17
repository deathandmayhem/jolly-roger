import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import Ansible from '../ansible.js';

const MimeTypes = {
  spreadsheet: 'application/vnd.google-apps.spreadsheet',
  document: 'application/vnd.google-apps.document',
};

const createDocument = function createDocument(name, type) {
  if (!_.has(MimeTypes, type)) {
    throw new Meteor.Error(400, `Invalid document type ${type}`);
  }

  const template = Models.Settings.findOne({ name: `gdrive.template.${type}` });
  const mimeType = MimeTypes[type];

  let file;
  if (template) {
    file = Meteor.wrapAsync(gdrive.files.copy)({
      fileId: template.value.id,
      resource: { name, mimeType },
    });
  } else {
    file = Meteor.wrapAsync(gdrive.files.create)({
      resource: { name, mimeType },
    });
  }

  const fileId = file.id;

  Meteor.wrapAsync(gdrive.permissions.create)({
    fileId,
    resource: { role: 'writer', type: 'anyone' },
  });
  return fileId;
};

const renameDocument = function renameDocument(id, name) {
  // It's unclear if this can ever return an error
  Meteor.wrapAsync(gdrive.files.update)({
    fileId: id,
    resource: { name },
  });
};

const grantPermission = function grantPermission(id, email, permission) {
  Meteor.wrapAsync(gdrive.permissions.create)({
    fileId: id,
    sendNotificationEmail: false,
    resource: {
      type: 'user',
      emailAddress: email,
      role: permission,
    },
  });
};

const ensureDocument = function ensureDocument(puzzle, type = 'spreadsheet') {
  let doc = Models.Documents.findOne({ puzzle: puzzle._id });
  if (!doc) {
    if (!gdrive) {
      throw new Meteor.Error(500, 'Google OAuth is not configured.');
    }

    Models.Locks.withLock(`puzzle:${puzzle._id}:documents`, () => {
      doc = Models.Documents.findOne({ puzzle: puzzle._id });
      if (!doc) {
        Ansible.log('Creating missing document for puzzle', {
          puzzle: puzzle._id,
        });

        const docId = createDocument(`${puzzle.title}: Death and Mayhem`, type);
        doc = {
          hunt: puzzle.hunt,
          puzzle: puzzle._id,
          provider: 'google',
          value: { type, id: docId },
        };
        doc._id = Models.Documents.insert(doc);
      }
    });
  }

  return doc;
};

export {
  createDocument,
  renameDocument,
  grantPermission,
  ensureDocument,
};
