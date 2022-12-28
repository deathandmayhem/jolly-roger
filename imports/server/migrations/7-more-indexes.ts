import Documents from '../../lib/models/Documents';
import Guesses from '../../lib/models/Guesses';
import MeteorUsers from '../../lib/models/MeteorUsers';
import Tags from '../../lib/models/Tags';
import Migrations from './Migrations';
import dropIndex from './dropIndex';

Migrations.add({
  version: 7,
  name: 'Add more missing indexes',
  async up() {
    await MeteorUsers.createIndexAsync({ hunts: 1 });

    await Tags.createIndexAsync({ deleted: 1, hunt: 1, name: 1 });

    await dropIndex(Tags, 'deleted_1_hunt_1');

    await Documents.createIndexAsync({ deleted: 1, puzzle: 1 });

    await Guesses.createIndexAsync({ deleted: 1, state: 1 });
  },
});
