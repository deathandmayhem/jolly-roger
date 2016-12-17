import { Migrations } from 'meteor/percolate:migrations';
import { Meteor } from 'meteor/meteor';

Migrations.add({
  version: 7,
  name: 'Add more missing indexes',
  up() {
    Meteor.users._ensureIndex({ hunts: 1 });

    Models.Tags._ensureIndex({ deleted: 1, hunt: 1, name: 1 });
    Models.Tags._dropIndex({ deleted: 1, hunt: 1 });

    Models.Documents._ensureIndex({ deleted: 1, puzzle: 1 });

    Models.Guesses._ensureIndex({ deleted: 1, state: 1 });
  },
});
