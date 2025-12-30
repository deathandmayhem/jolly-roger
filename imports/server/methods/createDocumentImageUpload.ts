import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { Random } from "meteor/random";
import Documents from "../../lib/models/Documents";
import MeteorUsers from "../../lib/models/MeteorUsers";
import createDocumentImageUpload from "../../methods/createDocumentImageUpload";
import getS3UploadParams from "../getS3UploadParams";
import defineMethod from "./defineMethod";

defineMethod(createDocumentImageUpload, {
  validate(arg) {
    check(arg, {
      documentId: String,
      filename: String,
      mimeType: String,
    });

    return arg;
  },

  async run({ documentId, filename, mimeType }) {
    check(this.userId, String);
    const user = (await MeteorUsers.findOneAsync(this.userId))!;

    const document = await Documents.findOneAsync(documentId);
    if (!document) {
      throw new Meteor.Error(404, "Document not found");
    }

    if (!user.hunts?.includes(document.hunt)) {
      throw new Meteor.Error(403, "User is not a member of this hunt");
    }

    const key = `${document.hunt}/${documentId}/${Random.id()}-${filename}`;

    return getS3UploadParams(key, mimeType);
  },
});
