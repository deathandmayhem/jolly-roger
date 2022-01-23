import { Migrations } from 'meteor/percolate:migrations';
import Announcements from '../../lib/models/announcements';
import ChatMessages from '../../lib/models/chats';
import Guesses from '../../lib/models/guesses';
import Puzzles from '../../lib/models/puzzles';
import Tags from '../../lib/models/tags';

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
