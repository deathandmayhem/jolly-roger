import Documents from "../../lib/models/Documents";
import Migrations from "./Migrations";

Migrations.add({
  version: 17,
  name: "Backfill provider for documents",
  async up() {
    await Documents.updateAsync(
      <any>{ provider: null },
      { $set: { provider: "google" } },
      { multi: true },
    );

    await Documents.collection
      .rawCollection()
      .updateMany(
        { type: "google-spreadsheet", "value.type": null },
        { $set: { "value.type": "spreadsheet" }, $unset: { type: 1 } },
        { bypassDocumentValidation: true },
      );
  },
});
