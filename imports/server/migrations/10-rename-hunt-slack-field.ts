import Hunts from "../../lib/models/Hunts";
import Migrations from "./Migrations";

Migrations.add({
  version: 10,
  name: "Rename hunt field slackChannel to firehoseSlackChannel",
  async up() {
    for await (const hunt of Hunts.find(<any>{
      firehoseSlackChannel: null,
      slackChannel: { $ne: null },
    })) {
      await Hunts.collection.rawCollection().updateOne(
        { _id: hunt._id },
        {
          $set: { firehoseSlackChannel: (<any>hunt).slackChannel },
          $unset: { slackChannel: 1 },
        },
        {
          bypassDocumentValidation: true,
        },
      );
    }
  },
});
