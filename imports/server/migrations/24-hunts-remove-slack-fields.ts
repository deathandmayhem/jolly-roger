import Hunts from "../../lib/models/Hunts";
import Migrations from "./Migrations";

Migrations.add({
  version: 24,
  name: "Remove Slack-related fields from Hunts",
  async up() {
    for await (const h of Hunts.find({
      $or: [
        { firehoseSlackChannel: { $exists: true } },
        { puzzleHooksSlackChannel: { $exists: true } },
      ],
    }) as any) {
      await Hunts.updateAsync(
        h._id,
        {
          $unset: {
            firehoseSlackChannel: "",
            puzzleHooksSlackChannel: "",
          },
        },
        {
          bypassSchema: true,
        },
      );
    }
  },
});
