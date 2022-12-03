import Puzzles from '../../lib/models/Puzzles';
import Tags from '../../lib/models/Tags';
import sendChatMessageInternal from '../sendChatMessageInternal';
import Hookset from './Hookset';

const ChatHooks: Hookset = {
  async onPuzzleSolved(puzzleId: string, answer: string) {
    const puzzle = Puzzles.findOne(puzzleId);
    if (!puzzle) return;

    // If this puzzle has any associated metas, announce that it's solved.
    const tags = Tags.find({ _id: { $in: puzzle.tags } }).fetch();
    const groups = tags.filter((tag) => tag.name.startsWith('group:'));
    const groupNames = groups.map((group) => group.name.substring('group:'.length));
    const metaTags = Tags.find({ name: { $in: groupNames.map((name) => `meta-for:${name}`) } }).fetch();
    const puzzlesWithMetaTags = Puzzles.find({
      tags: { $in: metaTags.map((tag) => tag._id) },
    }).fetch();

    const message = `${puzzle.title} (feeding into this meta) has been solved: ${answer}`;
    await puzzlesWithMetaTags.reduce(async (p, metaPuzzle) => {
      await p;
      await sendChatMessageInternal({
        puzzleId: metaPuzzle._id,
        message,
        sender: undefined,
      });
    }, Promise.resolve());
  },
};

export default ChatHooks;
