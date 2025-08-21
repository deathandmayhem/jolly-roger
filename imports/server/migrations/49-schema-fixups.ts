import MeteorUsers from "../../lib/models/MeteorUsers";
import Puzzles from "../../lib/models/Puzzles";
import Migrations from "./Migrations";

Migrations.add({
  version: 49,
  name: "Fix up database errors discovered by schema validation",
  async up() {
    // In 20-puzzle-multiple-answers.ts, we added the answers field but never
    // unset the old "answer" field
    for await (const puzzle of Puzzles.find({ answer: { $exists: true } })) {
      await Puzzles.updateAsync(puzzle._id, { $unset: { answer: 1 } });
    }

    // Prior to this revision, we would receive and store a "null" value for
    // Discord avatar, when our schema wants that value to be absent
    const users = MeteorUsers.find({
      "discordAccount.avatar": { $eq: null, $exists: true },
    });
    for await (const user of users) {
      await MeteorUsers.updateAsync(user._id, {
        $unset: { "discordAccount.avatar": 1 },
      });
    }
  },
});
