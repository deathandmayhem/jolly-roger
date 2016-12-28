import { Meteor } from 'meteor/meteor';
import Ansible from '/imports/ansible.js';

const createDocument = function createDocument(name, mimeType) {
  const template = Models.Settings.findOne({ name: 'gdrive.template' });

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

const ensureDocument = function ensureDocument(puzzle) {
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

        try {
          const docId = createDocument(
            `${puzzle.title}: Death and Mayhem`,
            'application/vnd.google-apps.spreadsheet'
            );
          doc = {
            hunt: puzzle.hunt,
            puzzle: puzzle._id,
            type: 'google-spreadsheet',
            value: { id: docId },
          };
          doc._id = Models.Documents.insert(doc);
        } catch (e) {
          // Don't totally explode if document creation fails
          Ansible.log('Failed to create a document!', { error: e.message });
        }
      }
    });
  }

  return doc ? doc._id : null;
};

export { createDocument, renameDocument, ensureDocument };
