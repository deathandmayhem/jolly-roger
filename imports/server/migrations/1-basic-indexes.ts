import Announcements from '../../lib/models/Announcements';
import ChatMessages from '../../lib/models/ChatMessages';
import Guesses from '../../lib/models/Guesses';
import Puzzles from '../../lib/models/Puzzles';
import Tags from '../../lib/models/Tags';
import Migrations from './Migrations';

Migrations.add({
  version: 1,
  name: 'Add basic indexes to collections',
  up() {
    Announcements.createIndex({ deleted: 1, hunt: 1, createdAt: -1 });
    ChatMessages.createIndex({ puzzleId: 1, timestamp: -1 });
    Guesses.createIndex({ deleted: 1, hunt: 1, puzzle: 1 });
    Puzzles.createIndex({ deleted: 1, hunt: 1 });
    Tags.createIndex({ deleted: 1, hunt: 1 });
  },
});
