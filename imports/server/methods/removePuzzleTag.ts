import { check } from 'meteor/check';
import Ansible from '../../Ansible';
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

  run({ puzzleId, tagId }) {
    check(this.userId, String);

    Ansible.log('Untagging puzzle', { puzzle: puzzleId, tag: tagId });
    Puzzles.update({
      _id: puzzleId,
    }, {
      $pull: {
        tags: tagId,
      },
    });
  },
});
