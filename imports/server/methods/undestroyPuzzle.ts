import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Flags from '../../Flags';
import Documents from '../../lib/models/Documents';
import Puzzles from '../../lib/models/Puzzles';
import { userMayWritePuzzlesForHunt } from '../../lib/permission_stubs';
import undestroyPuzzle from '../../methods/undestroyPuzzle';
import { makeReadWrite } from '../gdrive';

undestroyPuzzle.define({
  validate(arg) {
    check(arg, {
      puzzleId: String,
    });
    return arg;
  },

  async run({ puzzleId }) {
    check(this.userId, String);

    const puzzle = await Puzzles.findOneDeletedAsync(puzzleId);
    if (!puzzle) {
      throw new Meteor.Error(404, 'Unknown puzzle id');
    }
    if (!userMayWritePuzzlesForHunt(this.userId, puzzle.hunt)) {
      throw new Meteor.Error(
        401,
        `User ${this.userId} may not modify puzzles from hunt ${puzzle.hunt}`
      );
    }

    await Puzzles.updateAsync(puzzleId, {
      $set: {
        deleted: false,
      },
      $unset: {
        replacedBy: 1,
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
      await makeReadWrite(document.value.id);
    }
  },
});
