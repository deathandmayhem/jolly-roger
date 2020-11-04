import { check } from 'meteor/check';
import { Google } from 'meteor/google-oauth';
import { Meteor } from 'meteor/meteor';
import Ansible from '../ansible';
import Profiles from '../lib/models/profiles';

Meteor.methods({
  saveProfile(newProfile: unknown) {
    // Allow users to update/upsert profile data.
    check(this.userId, String);
    check(newProfile, {
      displayName: String,
      phoneNumber: String,
      muteApplause: Boolean,
    });
    const user = Meteor.users.findOne(this.userId)!;
    const primaryEmail = user.emails && user.emails[0].address;

    Ansible.log('Updating profile for user', { user: this.userId });
    Profiles.update({
      _id: this.userId,
    }, {
      $set: {
        displayName: newProfile.displayName,
        primaryEmail,
        phoneNumber: newProfile.phoneNumber,
        muteApplause: newProfile.muteApplause,
        deleted: false,
      },
    }, {
      upsert: true,
    });
  },

  linkUserGoogleAccount(key: unknown, secret: unknown) {
    check(this.userId, String);
    check(key, String);
    check(secret, String);

    // We don't care about actually capturing the credential - we're
    // not going to do anything with it (and with only identity
    // scopes, I don't think you can do anything with it), but we do
    // want to validate it.
    const credential = Google.retrieveCredential(key, secret);
    const email = credential.serviceData.email;
    Ansible.log('Linking user to Google account', {
      user: this.userId,
      email,
    });

    Profiles.update(this.userId, { $set: { googleAccount: email } });
  },

  unlinkUserGoogleAccount() {
    check(this.userId, String);
    Profiles.update(this.userId, { $unset: { googleAccount: 1 } });
  },
});
