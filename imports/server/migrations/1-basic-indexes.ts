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
    Announcements._ensureIndex({ deleted: 1, hunt: 1, createdAt: -1 });
    ChatMessages._ensureIndex({ puzzleId: 1, timestamp: -1 });
    Guesses._ensureIndex({ deleted: 1, hunt: 1, puzzle: 1 });
    Puzzles._ensureIndex({ deleted: 1, hunt: 1 });
    Tags._ensureIndex({ deleted: 1, hunt: 1 });
  },
});
