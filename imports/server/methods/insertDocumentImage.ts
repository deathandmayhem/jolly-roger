import { check, Match } from "meteor/check";
import { fetch } from "meteor/fetch";
import { Meteor } from "meteor/meteor";
import Documents from "../../lib/models/Documents";
import Settings from "../../lib/models/Settings";
import insertDocumentImage from "../../methods/insertDocumentImage";
import defineMethod from "./defineMethod";

defineMethod(insertDocumentImage, {
  validate(arg) {
    check(arg, {
      documentId: String,
      sheetId: Number,
      image: Match.OneOf(
        {
          source: Match.OneOf("upload"),
          filename: String,
          contents: String,
        },
        {
          source: Match.OneOf("link"),
          url: String,
        },
      ),
    });

    return arg;
  },

  async run({ documentId, sheetId, image }) {
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

    let imageParams;
    switch (image.source) {
      case "upload":
        imageParams = {
          "upload-filename": image.filename,
          "upload-contents": image.contents,
        };
        break;
      case "link":
        imageParams = {
          link: image.url,
        };
        break;
      default:
        throw new Meteor.Error(400, "Invalid image source");
    }

    const params = {
      secret: app.value.sharedSecret,
      method: "insertImage",
      parameters: {
        spreadsheet: document.value.id,
        sheet: sheetId.toString(),
        source: image.source,
        ...imageParams,
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
      throw new Meteor.Error(500, `Image insert failed: ${await resp.text()}`);
    }

    const respJson = await resp.json();
    if (!respJson.ok) {
      throw new Meteor.Error(500, `Image insert failed: ${respJson.error}`);
    }
  },
});
