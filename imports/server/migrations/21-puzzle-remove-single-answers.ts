import Puzzles from "../../lib/models/Puzzles";
import Migrations from "./Migrations";

Migrations.add({
  version: 21,
  name: "Remove older answer field from puzzles",
  async up() {
    await Puzzles.collection.rawCollection().updateMany(
      {},
      {
        $unset: {
          answer: 1,
        },
      },
      {
        bypassDocumentValidation: true,
      },
    );
  },
});
