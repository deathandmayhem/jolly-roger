import { check } from 'meteor/check';
import { Google } from 'meteor/google-oauth';
import { Meteor } from 'meteor/meteor';
import Flags from '../../Flags';
import Logger from '../../Logger';
import MeteorUsers from '../../lib/models/MeteorUsers';
import linkUserGoogleAccount from '../../methods/linkUserGoogleAccount';
import { ensureHuntFolderPermission } from '../gdrive';

linkUserGoogleAccount.define({
  validate(arg) {
    check(arg, {
      key: String,
      secret: String,
    });
    return arg;
  },

  async run({ key, secret }) {
    check(this.userId, String);

    // We don't care about actually capturing the credential - we're
    // not going to do anything with it (and with only identity
    // scopes, I don't think you can do anything with it), but we do
    // want to validate it.
    const credential = Google.retrieveCredential(key, secret);
    const { email, id } = credential.serviceData;
    Logger.info('Linking user to Google account', {
      email,
      id,
    });

    await MeteorUsers.updateAsync(this.userId, {
      $set: {
        googleAccount: email,
        googleAccountId: id,
      },
    });

    if (!Flags.active('disable.google') && !Flags.active('disable.gdrive_permissions')) {
      const hunts = Meteor.user()!.hunts;
      await hunts?.reduce(async (promise, huntId) => {
        await promise;
        await ensureHuntFolderPermission(huntId, this.userId!, email);
      }, Promise.resolve());
    }
  },
});
