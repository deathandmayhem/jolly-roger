import Puzzles from "../../lib/models/Puzzles";
import Migrations from "./Migrations";

Migrations.add({
  version: 20,
  name: "Backfill multiple answer support onto puzzles",
  async up() {
    for await (const p of Puzzles.find() as any) {
      if (p.answers) return; // already migrated

      const answers = [];
      if (p.answer) {
        answers.push(p.answer);
      }

      await Puzzles.collection.rawCollection().updateOne(
        { _id: p._id },
        {
          $set: {
            expectedAnswerCount: 1,
            answers,
          },
        },
        {
          bypassDocumentValidation: true,
        },
      );
    }
  },
});
