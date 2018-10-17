import { Migrations } from 'meteor/percolate:migrations';

Migrations.add({
  version: 12,
  name: 'Add indexes for document permissions',
  up() {
    Models.DocumentPermissions._ensureIndex(
      { document: 1, user: 1, googleAccount: 1 },
      { unique: true }
    );
  },
});
