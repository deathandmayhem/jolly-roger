import { check } from 'meteor/check';
import Logger from '../../Logger';
import Puzzles from '../../lib/models/Puzzles';
import removePuzzleTag from '../../methods/removePuzzleTag';

removePuzzleTag.define({
  validate(arg) {
    check(arg, {
      puzzleId: String,
      tagId: String,
    });

    return arg;
  },

  async run({ puzzleId, tagId }) {
    check(this.userId, String);

    Logger.info('Untagging puzzle', { puzzle: puzzleId, tag: tagId });
    await Puzzles.updateAsync({
      _id: puzzleId,
    }, {
      $pull: {
        tags: tagId,
      },
    });
  },
});
