import { check } from "meteor/check";
import { fetch } from "meteor/fetch";
import { Meteor } from "meteor/meteor";

import Documents from "../../lib/models/Documents";
import Settings from "../../lib/models/Settings";
import listDocumentSheets from "../../methods/listDocumentSheets";
import defineMethod from "./defineMethod";

defineMethod(listDocumentSheets, {
  validate(arg) {
    check(arg, {
      documentId: String,
    });
    return arg;
  },

  async run({ documentId }) {
    check(this.userId, String);

    const document = await Documents.findOneAsync(documentId);
    if (!document) {
      throw new Meteor.Error(404, "Document not found");
    }

    if (
      document.provider !== "google" ||
      document.value.type !== "spreadsheet"
    ) {
      throw new Meteor.Error(400, "Document is not a Google spreadsheet");
    }

    const app = await Settings.findOneAsync({ name: "google.script" });
    if (!app?.value.sharedSecret || !app?.value.endpointUrl) {
      throw new Meteor.Error(400, "Google Script is not configured");
    }

    const params = {
      secret: app.value.sharedSecret,
      method: "listSheets",
      parameters: {
        spreadsheet: document.value.id,
      },
    };

    const resp = await fetch(app.value.endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });
    if (!resp.ok) {
      throw new Meteor.Error(
        500,
        `Failed to list sheets: ${await resp.text()}`,
      );
    }

    const json = await resp.json();
    if (!json.ok) {
      throw new Meteor.Error(500, `Failed to list sheets: ${json.error}`);
    }

    return json.sheets;
  },
});
