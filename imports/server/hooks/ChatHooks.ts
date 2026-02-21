import i18n from "i18next";
import { contentFromMessage } from "../../lib/models/ChatMessages";
import type { PuzzleType } from "../../lib/models/Puzzles";
import Puzzles from "../../lib/models/Puzzles";
import Tags from "../../lib/models/Tags";
import { serverLanguage } from "../lang";
import sendChatMessageInternal from "../sendChatMessageInternal";
import type Hookset from "./Hookset";

/**
 * Find puzzles with matching tags with a different prefix.
 *
 * For example, if fromPrefix is `group:` and toPrefix is `meta-for:`, this function will map a
 * puzzle in `group:X` to all puzzles marked `meta-for:X`.
 */
async function findPuzzlesWithMatchingTag(
  puzzle: PuzzleType,
  fromPrefix: string,
  toPrefix: string,
): Promise<PuzzleType[]> {
  const tags = await Tags.find({ _id: { $in: puzzle.tags } }).fetchAsync();
  const groups = tags.filter((tag) => tag.name.startsWith(fromPrefix));
  const groupNames = groups.map((group) => group.name.slice(fromPrefix.length));
  const matchingTags = await Tags.find({
    hunt: puzzle.hunt,
    name: {
      $in: groupNames.map((name) => `${toPrefix}${name}`),
    },
  }).fetchAsync();
  return Puzzles.find({
    hunt: puzzle.hunt,
    tags: { $in: matchingTags.map((tag) => tag._id) },
    _id: { $ne: puzzle._id }, // Avoid sending a notification to the puzzle that was just solved.
  }).fetchAsync();
}

function findMetaPuzzles(puzzle: PuzzleType): Promise<PuzzleType[]> {
  return findPuzzlesWithMatchingTag(puzzle, "group:", "meta-for:");
}

function findFeederPuzzles(puzzle: PuzzleType): Promise<PuzzleType[]> {
  return findPuzzlesWithMatchingTag(puzzle, "meta-for:", "group:");
}

async function sendMessageToPuzzles(puzzles: PuzzleType[], message: string) {
  const content = contentFromMessage(message);
  for (const puzzle of puzzles) {
    await sendChatMessageInternal({
      puzzleId: puzzle._id,
      content,
      sender: undefined,
    });
  }
}

const ChatHooks: Hookset = {
  name: "ChatHooks",

  async onPuzzleSolved(puzzleId: string, answer: string) {
    const puzzle = await Puzzles.findOneAsync(puzzleId);
    if (!puzzle) return;

    // If this puzzle has any associated metas, announce that it's solved.
    await sendMessageToPuzzles(
      await findMetaPuzzles(puzzle),
      i18n.t(
        "chat.hooks.feederSolved",
        `{{puzzle}} (feeding into this meta) has been solved: \`{{answer}}\``,
        { lng: serverLanguage, answer: answer, puzzle: puzzle.title },
      ),
    );

    // If this was a meta puzzle, announce that it's solved to all feeders.
    await sendMessageToPuzzles(
      await findFeederPuzzles(puzzle),
      i18n.t(
        "chat.hooks.metaSolved",
        `{{puzzle}} (meta for this puzzle) has been solved: \`{{answer}}\``,
        { lng: serverLanguage, answer: answer, puzzle: puzzle.title },
      ),
    );
  },

  async onPuzzleNoLongerSolved(puzzleId: string, answer: string) {
    const puzzle = await Puzzles.findOneAsync(puzzleId);
    if (!puzzle) return;

    // If this puzzle has any associated metas, announce that it's no longer solved.
    await sendMessageToPuzzles(
      await findMetaPuzzles(puzzle),
      i18n.t(
        "chat.hooks.feederWrong",
        `Answer \`{{answer}}\` for {{puzzle}} (feeding into this meta) was marked incorrect`,
        { lng: serverLanguage, answer: answer, puzzle: puzzle.title },
      ),
    );

    // If this was a meta puzzle, announce that it's no longer solved to all feeders.
    await sendMessageToPuzzles(
      await findFeederPuzzles(puzzle),
      i18n.t(
        "chat.hooks.metaWrong",
        `Answer \`{{answer}}\` for {{puzzle}} (meta for this puzzle) was marked incorrect`,
        { lng: serverLanguage, answer: answer, puzzle: puzzle.title },
      ),
    );
  },
};

export default ChatHooks;
