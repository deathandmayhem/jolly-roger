import Puzzles from "../../lib/models/Puzzles";
import Migrations from "./Migrations";

Migrations.add({
  version: 48,
  name: "Make puzzle tags unique",
  async up() {
    for await (const puzzle of Puzzles.find()) {
      const uniqueTags = [...new Set(puzzle.tags)];
      if (uniqueTags.length === puzzle.tags.length) {
        continue;
      }

      await Puzzles.updateAsync(puzzle._id, {
        $set: {
          tags: uniqueTags,
        },
      });
    }
  },
});
