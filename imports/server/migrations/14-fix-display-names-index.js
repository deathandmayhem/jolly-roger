import { Migrations } from 'meteor/percolate:migrations';
import { dropIndex } from '../migrations.js';

Migrations.add({
  version: 14,
  name: 'Add correct indexes for viewing profiles by display name',
  up() {
    dropIndex(Models.DocumentPermissions, 'deleted_1__id_1_displayName_1');

    Models.Profiles._ensureIndex(
      { deleted: 1, _id: 1, displayName: 1 }
    );
  },
});
