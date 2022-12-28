import Announcements from '../../lib/models/Announcements';
import ChatMessages from '../../lib/models/ChatMessages';
import Guesses from '../../lib/models/Guesses';
import Puzzles from '../../lib/models/Puzzles';
import Tags from '../../lib/models/Tags';
import Migrations from './Migrations';

Migrations.add({
  version: 1,
  name: 'Add basic indexes to collections',
  async up() {
    await Announcements.createIndexAsync({ deleted: 1, hunt: 1, createdAt: -1 });
    await ChatMessages.createIndexAsync({ puzzleId: 1, timestamp: -1 });
    await Guesses.createIndexAsync({ deleted: 1, hunt: 1, puzzle: 1 });
    await Puzzles.createIndexAsync({ deleted: 1, hunt: 1 });
    await Tags.createIndexAsync({ deleted: 1, hunt: 1 });
  },
});
