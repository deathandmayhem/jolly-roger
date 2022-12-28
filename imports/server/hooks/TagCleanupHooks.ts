import Puzzles from '../../lib/models/Puzzles';
import Tags from '../../lib/models/Tags';
import Hookset from './Hookset';

const TagCleanupHooks: Hookset = {
  onPuzzleSolved(puzzleId: string) {
    const puzzle = await Puzzles.findOneAsync(puzzleId);
    if (!puzzle) return;

    // If a puzzle is now fully solved, remove any `needs:*` tags from it.
    if (puzzle.answers.length >= puzzle.expectedAnswerCount) {
      const tags = await Tags.find({ _id: { $in: puzzle.tags } }).fetchAsync();

      const needsTags = tags.filter((tag) => tag.name.startsWith('needs:'));
      const needsTagsIds = needsTags.map((tag) => tag._id);
      await Puzzles.updateAsync({
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
