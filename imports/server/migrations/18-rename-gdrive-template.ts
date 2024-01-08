import Settings from "../../lib/models/Settings";
import Migrations from "./Migrations";

Migrations.add({
  version: 18,
  name: "Update the Google Spreadsheet template setting name",
  async up() {
    await Settings.updateAsync(<any>{ name: "gdrive.template" }, {
      $set: { name: "gdrive.template.spreadsheet" },
    });
  },
});
