import MeteorUsers from "../../lib/models/MeteorUsers";
import Migrations from "./Migrations";

Migrations.add({
  version: 52,
  name: "Remove deprecated Discord discriminator field",
  async up() {
    await MeteorUsers.updateAsync(
      { "discordAccount.discriminator": { $exists: true } },
      { $unset: { "discordAccount.discriminator": 1 } },
      { multi: true },
    );
  },
});
