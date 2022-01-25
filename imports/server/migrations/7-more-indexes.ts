import { Migrations } from 'meteor/percolate:migrations';
import Documents from '../../lib/models/Documents';
import Guesses from '../../lib/models/Guesses';
import MeteorUsers from '../../lib/models/MeteorUsers';
import Tags from '../../lib/models/Tags';
import dropIndex from './dropIndex';

Migrations.add({
  version: 7,
  name: 'Add more missing indexes',
  up() {
    MeteorUsers._ensureIndex({ hunts: 1 });

    Tags._ensureIndex({ deleted: 1, hunt: 1, name: 1 });

    dropIndex(Tags, 'deleted_1_hunt_1');

    Documents._ensureIndex({ deleted: 1, puzzle: 1 });

    Guesses._ensureIndex({ deleted: 1, state: 1 });
  },
});
