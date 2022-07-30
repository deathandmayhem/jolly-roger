import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { userMayConfigureAssets } from '../../lib/permission_stubs';
import generateUploadToken from '../../methods/generateUploadToken';
import UploadTokens from '../models/UploadTokens';

generateUploadToken.define({
  validate(arg) {
    check(arg, {
      assetName: String,
      assetMimeType: String,
    });
    return arg;
  },

  run({ assetName, assetMimeType }) {
    check(this.userId, String);
    if (!userMayConfigureAssets(this.userId)) {
      throw new Meteor.Error(401, 'Must be admin to configure branding assets');
    }
    const token = UploadTokens.insert({ asset: assetName, mimeType: assetMimeType });
    return token;
  },
});
