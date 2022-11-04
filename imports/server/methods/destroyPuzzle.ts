import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Flags from '../../Flags';
import Documents from '../../lib/models/Documents';
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

    const puzzle = Puzzles.findOne(puzzleId);
    if (!puzzle) {
      throw new Meteor.Error(404, 'Unknown puzzle id');
    }
    if (!userMayWritePuzzlesForHunt(this.userId, puzzle.hunt)) {
      throw new Meteor.Error(
        401,
        `User ${this.userId} may not modify puzzles from hunt ${puzzle.hunt}`
      );
    }

    if (replacedBy) {
      const replacedByPuzzle = Puzzles.findOne(replacedBy);
      if (!replacedByPuzzle || replacedByPuzzle.hunt !== puzzle.hunt) {
        throw new Meteor.Error(400, 'Invalid replacement puzzle');
      }
    }

    Puzzles.update(puzzleId, {
      $set: {
        replacedBy: replacedBy || undefined,
        deleted: true,
      },
    });

    if (Flags.active('disable.google')) {
      return;
    }

    if (Flags.active('disable.gdrive_permissions')) {
      return;
    }

    const document = Documents.findOne({ puzzle: puzzleId });

    if (document) {
      await makeReadOnly(document.value.id);
    }
  },
});
