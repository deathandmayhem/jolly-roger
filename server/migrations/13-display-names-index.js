import { Migrations } from 'meteor/percolate:migrations';

Migrations.add({
  version: 13,
  name: 'Add indexes for viewing profiles by display name',
  up() {
    Models.DocumentPermissions._ensureIndex(
      { deleted: 1, _id: 1, displayName: 1 }
    );
  },
});
