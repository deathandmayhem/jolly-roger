import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Flags from '../../Flags';
import MeteorUsers from '../../lib/models/MeteorUsers';
import Puzzles from '../../lib/models/Puzzles';
import ensurePuzzleDocument from '../../methods/ensurePuzzleDocument';
import { ensureDocument, ensureHuntFolderPermission } from '../gdrive';

ensurePuzzleDocument.define({
  validate(arg) {
    check(arg, {
      puzzleId: String,
    });
    return arg;
  },

  run({ puzzleId }) {
    check(this.userId, String);

    const user = MeteorUsers.findOne(this.userId)!;
    const puzzle = Puzzles.findOne(puzzleId);
    if (!puzzle || !user.hunts?.includes(puzzle.hunt)) {
      throw new Meteor.Error(404, 'Unknown puzzle');
    }

    this.unblock();

    ensureDocument(puzzle);

    if (Flags.active('disable.google')) {
      return;
    }

    if (Flags.active('disable.gdrive_permissions')) {
      return;
    }

    if (user.googleAccount) {
      ensureHuntFolderPermission(puzzle.hunt, this.userId, user.googleAccount);
    }
  },
});
