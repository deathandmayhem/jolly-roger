import Settings from "../../lib/models/Settings";
import Migrations from "./Migrations";

Migrations.add({
  version: 29,
  name: "Remove leading _ on guild id field",
  async up() {
    await Settings.collection
      .rawCollection()
      .updateMany(
        { name: "discord.guild" },
        { $rename: { "value.guild._id": "value.guild.id" } },
        { bypassDocumentValidation: true },
      );
  },
});
