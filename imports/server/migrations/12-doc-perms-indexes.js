import { Migrations } from 'meteor/percolate:migrations';
import DocumentPermissions from '../../lib/models/document_permissions.js';

Migrations.add({
  version: 12,
  name: 'Add indexes for document permissions',
  up() {
    DocumentPermissions._ensureIndex(
      { document: 1, user: 1, googleAccount: 1 },
      { unique: true }
    );
  },
});
