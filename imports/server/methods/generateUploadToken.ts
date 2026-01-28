import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";

import MeteorUsers from "../../lib/models/MeteorUsers";
import { userMayConfigureAssets } from "../../lib/permission_stubs";
import generateUploadToken from "../../methods/generateUploadToken";
import UploadTokens from "../models/UploadTokens";
import defineMethod from "./defineMethod";

defineMethod(generateUploadToken, {
  validate(arg) {
    check(arg, {
      assetName: String,
      assetMimeType: String,
    });
    return arg;
  },

  async run({ assetName, assetMimeType }) {
    check(this.userId, String);
    if (!userMayConfigureAssets(await MeteorUsers.findOneAsync(this.userId))) {
      throw new Meteor.Error(401, "Must be admin to configure branding assets");
    }
    const token = await UploadTokens.insertAsync({
      asset: assetName,
      mimeType: assetMimeType,
    });
    return token;
  },
});
