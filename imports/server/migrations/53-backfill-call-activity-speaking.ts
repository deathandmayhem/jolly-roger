import CallActivities from "../models/CallActivities";
import Migrations from "./Migrations";

Migrations.add({
  version: 53,
  name: "Backfill speaking flag on existing call activities",
  async up() {
    // Records predating presence tracking were all speech, so mark them speaking.
    await CallActivities.updateAsync(
      { speaking: { $exists: false } },
      { $set: { speaking: true } },
      { multi: true },
    );
  },
});
