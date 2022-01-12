import { Migrations } from 'meteor/percolate:migrations';

Migrations.add({
  version: 12,
  name: 'Add indexes for document permissions',
  up() {
    // This migration was used for the DocumentPermissions model, which has
    // since been removed.
  },
});
