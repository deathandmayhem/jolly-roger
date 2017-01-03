import { Migrations } from 'meteor/percolate:migrations';
import { Meteor } from 'meteor/meteor';

Migrations.add({
  version: 14,
  name: 'Add correct indexes for viewing profiles by display name',
  up() {
    // _dropIndex is not idempotent, so we need to figure out if the
    // index already exists
    const docPermsCollection = Models.DocumentPermissions.rawCollection();
    const dockPermsIndexExists = Meteor.wrapAsync(
      docPermsCollection.indexExists, docPermsCollection);
    if (dockPermsIndexExists({ deleted: 1, _id: 1, displayName: 1 })) {
      Models.DocumentPermissions._dropIndex({ deleted: 1, _id: 1, displayName: 1 });
    }

    Models.Profiles._ensureIndex(
      { deleted: 1, _id: 1, displayName: 1 }
    );
  },
});
