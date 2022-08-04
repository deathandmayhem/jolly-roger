import Puzzles from '../../lib/models/Puzzles';
import Tags from '../../lib/models/Tags';
import Hookset from './Hookset';

const TagCleanupHooks: Hookset = {
  onPuzzleSolved(puzzleId: string) {
    const puzzle = Puzzles.findOne(puzzleId);
    if (!puzzle) return;

    // If a puzzle is now fully solved, remove any `needs:*` tags from it.
    if (puzzle.answers.length >= puzzle.expectedAnswerCount) {
      const tags = Tags.find({ _id: { $in: puzzle.tags } }).fetch();

      const needsTags = tags.filter((tag) => tag.name.startsWith('needs:'));
      const needsTagsIds = needsTags.map((tag) => tag._id);
      Puzzles.update({
        _id: puzzleId,
      }, {
        $pullAll: {
          tags: needsTagsIds,
        },
      });
    }
  },
};

export default TagCleanupHooks;
