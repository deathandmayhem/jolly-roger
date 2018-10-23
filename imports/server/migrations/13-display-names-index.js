import { Migrations } from 'meteor/percolate:migrations';
import DocumentPermissions from '../../lib/models/document_permissions.js';

Migrations.add({
  version: 13,
  name: 'Add indexes for viewing profiles by display name',
  up() {
    DocumentPermissions._ensureIndex(
      { deleted: 1, _id: 1, displayName: 1 }
    );
  },
});
