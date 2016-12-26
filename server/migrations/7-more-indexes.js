import { Migrations } from 'meteor/percolate:migrations';
import { Meteor } from 'meteor/meteor';

Migrations.add({
  version: 7,
  name: 'Add more missing indexes',
  up() {
    Meteor.users._ensureIndex({ hunts: 1 });

    Models.Tags._ensureIndex({ deleted: 1, hunt: 1, name: 1 });

    // _dropIndex is not idempotent, so we need to figure out if the
    // index already exists
    const tagsCollection = Models.Tags.rawCollection();
    const tagsIndexExists = Meteor.wrapAsync(tagsCollection.indexExists).bind(tagsCollection);
    if (tagsIndexExists({ deleted: 1, hunt: 1 })) {
      Models.Tags._dropIndex({ deleted: 1, hunt: 1 });
    }

    Models.Documents._ensureIndex({ deleted: 1, puzzle: 1 });

    Models.Guesses._ensureIndex({ deleted: 1, state: 1 });
  },
});
