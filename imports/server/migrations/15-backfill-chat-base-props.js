import { Migrations } from 'meteor/percolate:migrations';
import { dropIndex } from '../migrations.js';

Migrations.add({
  version: 15,
  name: 'Backfill props from the base schema on chat messages',
  up() {
    const hunts = {};
    Models.Puzzles.find().forEach((p) => { hunts[p._id] = p.hunt; });

    Models.ChatMessages.findAllowingDeleted({
      $or: [
        { deleted: null },
        { createdAt: null },
        { createdBy: null },
        { puzzle: null },
        { hunt: null },
      ],
    }).forEach((m) => {
      Models.ChatMessages.update(m._id, {
        $set: {
          deleted: m.deleted === undefined ? false : m.deleted,
          puzzle: m.puzzle === undefined ? m.puzzleId : m.puzzle,
          hunt: m.hunt === undefined ? hunts[m.puzzle] : m.hunt,
          createdAt: m.createdAt === undefined ? m.timestamp : m.createdAt,
          createdBy: m.createdBy === undefined ? m.sender : m.createdBy,
        },
        $unset: {
          puzzleId: 1,
        },
      }, {
        validate: false,
        getAutoValues: false,
      });
    });

    dropIndex(Models.ChatMessages, 'puzzleId_1_timestamp_-1');
    Models.ChatMessages._ensureIndex({ deleted: 1, puzzle: 1 });
  },
});
