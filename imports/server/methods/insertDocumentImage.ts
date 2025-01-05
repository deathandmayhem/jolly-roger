import { check, Match } from "meteor/check";
import { fetch } from "meteor/fetch";
import { Meteor } from "meteor/meteor";
import Documents from "../../lib/models/Documents";
import Settings from "../../lib/models/Settings";
import insertDocumentImage from "../../methods/insertDocumentImage";
import defineMethod from "./defineMethod";

async function validateImageLink(link: string) {
  // Attempt to fetch the response headers for the image to determine the MIME type.
  // If the request fails, we continue with the upload - invalid images will still fail, just with
  // a more confusing error message. We do this here and not client-side to bypass any CORS
  // restrictions. We do this here and not in the App Script to make a HEAD request and avoid
  // fetching the image contents.
  const resp = await fetch(link, {
    method: "HEAD",
  });
  if (!resp.ok) {
    // Couldn't fetch the image for validation. Let the request through.
    return;
  }
  const contentType = resp.headers.get("Content-Type");
  if (!contentType) {
    // Response didn't include content-type header. Let the request through.
    return;
  }
  if (
    contentType !== "image/png" &&
    contentType !== "image/jpeg" &&
    contentType !== "image/gif"
  ) {
    throw new Meteor.Error(
      400,
      "Unsupported format. Only PNG/GIF/JPG are supported. Try copying the image and pasting " +
        "into the sheet with the keyboard instead.",
    );
  }
}

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
        await validateImageLink(image.url);
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
