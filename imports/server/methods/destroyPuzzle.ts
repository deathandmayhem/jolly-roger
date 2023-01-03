import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Flags from '../../Flags';
import Documents from '../../lib/models/Documents';
import Hunts from '../../lib/models/Hunts';
import MeteorUsers from '../../lib/models/MeteorUsers';
import Puzzles from '../../lib/models/Puzzles';
import { userMayWritePuzzlesForHunt } from '../../lib/permission_stubs';
import destroyPuzzle from '../../methods/destroyPuzzle';
import { makeReadOnly } from '../gdrive';

destroyPuzzle.define({
  validate(arg) {
    check(arg, {
      puzzleId: String,
      replacedBy: Match.Optional(String),
    });
    return arg;
  },

  async run({ puzzleId, replacedBy }) {
    check(this.userId, String);

    const puzzle = await Puzzles.findOneAsync(puzzleId);
    if (!puzzle) {
      throw new Meteor.Error(404, 'Unknown puzzle id');
    }
    if (!userMayWritePuzzlesForHunt(
      await MeteorUsers.findOneAsync(this.userId),
      await Hunts.findOneAsync(puzzle.hunt),
    )) {
      throw new Meteor.Error(
        401,
        `User ${this.userId} may not modify puzzles from hunt ${puzzle.hunt}`
      );
    }

    if (replacedBy) {
      const replacedByPuzzle = await Puzzles.findOneAsync(replacedBy);
      if (!replacedByPuzzle || replacedByPuzzle.hunt !== puzzle.hunt) {
        throw new Meteor.Error(400, 'Invalid replacement puzzle');
      }
    }

    await Puzzles.updateAsync(puzzleId, {
      $set: {
        replacedBy,
        deleted: true,
      },
    });

    if (Flags.active('disable.google')) {
      return;
    }

    if (Flags.active('disable.gdrive_permissions')) {
      return;
    }

    const document = await Documents.findOneAsync({ puzzle: puzzleId });

    if (document) {
      await makeReadOnly(document.value.id);
    }
  },
});
