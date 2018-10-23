import { Migrations } from 'meteor/percolate:migrations';
import { Meteor } from 'meteor/meteor';
import { dropIndex } from '../migrations.js';
import Documents from '../../lib/models/documents.js';
import Guesses from '../../lib/models/guess.js';
import Tags from '../../lib/models/tags.js';

Migrations.add({
  version: 7,
  name: 'Add more missing indexes',
  up() {
    Meteor.users._ensureIndex({ hunts: 1 });

    Tags._ensureIndex({ deleted: 1, hunt: 1, name: 1 });

    dropIndex(Tags, 'deleted_1_hunt_1');

    Documents._ensureIndex({ deleted: 1, puzzle: 1 });

    Guesses._ensureIndex({ deleted: 1, state: 1 });
  },
});
