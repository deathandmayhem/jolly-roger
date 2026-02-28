import ChatMessages from "../../lib/models/ChatMessages";
import Puzzles from "../../lib/models/Puzzles";
import Migrations from "./Migrations";

Migrations.add({
  version: 15,
  name: "Backfill props from the base schema on chat messages",
  async up() {
    const hunts: Record<string, string> = {};
    for await (const p of Puzzles.find()) {
      hunts[p._id] = p.hunt;
    }

    for await (const m of ChatMessages.findAllowingDeleted(<any>{
      $or: [
        { deleted: null },
        { createdAt: null },
        { createdBy: null },
        { puzzle: null },
        { hunt: null },
      ],
    })) {
      await ChatMessages.collection.rawCollection().updateOne(
        { _id: m._id },
        {
          $set: {
            deleted: m.deleted === undefined ? false : m.deleted,
            puzzle: m.puzzle === undefined ? (<any>m).puzzleId : m.puzzle,
            hunt: m.hunt === undefined ? hunts[m.puzzle] : m.hunt,
            createdAt: m.createdAt === undefined ? m.timestamp : m.createdAt,
            createdBy: m.createdBy === undefined ? m.sender : m.createdBy,
          },
          $unset: {
            puzzleId: 1,
          },
        },
        {
          bypassDocumentValidation: true,
        },
      );
    }
  },
});
