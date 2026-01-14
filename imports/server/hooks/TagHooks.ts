import { next } from "slate";
import Flags from "../../Flags";
import { normalizedMessageDingsUserByDingword } from "../../lib/dingwordLogic";
import MeteorUsers from "../../lib/models/MeteorUsers";
import PuzzleNotifications from "../../lib/models/PuzzleNotifications";
import Puzzles from "../../lib/models/Puzzles";
import Tags from "../../lib/models/Tags";
import type Hookset from "./Hookset";

const TagHooks: Hookset = {
  async onAddPuzzleTag(puzzleId: string, tagId: string, addingUserId: string) {
    const puzzle = (await Puzzles.findOneAsync({ _id: puzzleId }))!;
    const tag = (await Tags.findOneAsync({ _id: tagId }))!;
    const usersToNotify = new Set<string>();
    const tagName = tag.name; // This is now safe as `tag` is awaited

    // Respect feature flag.
    if (!(await Flags.activeAsync("disable.dingwords"))) {
      const normalizedText =
        tagName?.trim().toLowerCase().replace(":", " ") ?? "";
      // Find all users who are in this hunt with dingwords set.
      for await (const u of MeteorUsers.find(
        { hunts: puzzle?.hunt, "dingwords.0": { $exists: true } },
        { fields: { _id: 1, dingwords: 1 } },
      )) {
        if (
          normalizedMessageDingsUserByDingword(normalizedText, u).length > 0
        ) {
          usersToNotify.add(u._id);
        }
      }
    }

    const collected: string[] = [];
    usersToNotify.forEach((userId) => {
      if (userId === addingUserId) {
        next;
      }
      collected.push(userId);
    });
    await Promise.all(
      collected.map(async (userId: string) => {
        await PuzzleNotifications.insertAsync({
          user: userId,
          puzzle: puzzleId,
          hunt: puzzle.hunt,
          content: `${puzzle.title} has been tagged with '${tagName}'`,
          background: "secondary",
        });
      }),
    );
  },
};

export default TagHooks;
