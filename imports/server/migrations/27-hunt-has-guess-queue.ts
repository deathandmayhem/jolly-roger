import Hunts from "../../lib/models/Hunts";
import Migrations from "./Migrations";

Migrations.add({
  version: 27,
  name: "Add hasGuessQueue to Hunt model for whether to have a guess queue or direct answers",
  async up() {
    for await (const hunt of Hunts.find({})) {
      await Hunts.collection.rawCollection().updateOne(
        { _id: hunt._id },
        {
          $set: { hasGuessQueue: true },
        },
        {
          bypassDocumentValidation: true,
        },
      );
    }
  },
});
