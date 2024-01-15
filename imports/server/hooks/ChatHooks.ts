import { contentFromMessage } from "../../lib/models/ChatMessages";
import Puzzles from "../../lib/models/Puzzles";
import Tags from "../../lib/models/Tags";
import sendChatMessageInternal from "../sendChatMessageInternal";
import type Hookset from "./Hookset";

const ChatHooks: Hookset = {
  async onPuzzleSolved(puzzleId: string, answer: string) {
    const puzzle = await Puzzles.findOneAsync(puzzleId);
    if (!puzzle) return;

    // If this puzzle has any associated metas, announce that it's solved.
    const tags = await Tags.find({ _id: { $in: puzzle.tags } }).fetchAsync();
    const groups = tags.filter((tag) => tag.name.startsWith("group:"));
    const groupNames = groups.map((group) =>
      group.name.substring("group:".length),
    );
    const metaTags = await Tags.find({
      hunt: puzzle.hunt,
      name: {
        $in: groupNames.map((name) => `meta-for:${name}`),
      },
    }).fetchAsync();
    const puzzlesWithMetaTags = await Puzzles.find({
      hunt: puzzle.hunt,
      tags: { $in: metaTags.map((tag) => tag._id) },
      _id: { $ne: puzzleId }, // Avoid sending a notification to the puzzle that was just solved.
    }).fetchAsync();

    const message = `${puzzle.title} (feeding into this meta) has been solved: \`${answer}\``;
    const content = contentFromMessage(message);
    for (const metaPuzzle of puzzlesWithMetaTags) {
      await sendChatMessageInternal({
        puzzleId: metaPuzzle._id,
        content,
        sender: undefined,
      });
    }
  },
};

export default ChatHooks;
