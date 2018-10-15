import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Ansible from '../ansible.js';

Meteor.methods({
  saveProfile(newProfile) {
    // Allow users to update/upsert profile data.
    check(this.userId, String);
    check(newProfile, {
      displayName: String,
      phoneNumber: String,
      slackHandle: String,
      muteApplause: Boolean,
    });
    const user = Meteor.users.findOne(this.userId);
    const primaryEmail = user.emails[0].address;

    Ansible.log('Updating profile for user', { user: this.userId });
    Models.Profiles.update({
      _id: this.userId,
    }, {
      $set: {
        displayName: newProfile.displayName,
        primaryEmail,
        phoneNumber: newProfile.phoneNumber,
        slackHandle: newProfile.slackHandle,
        muteApplause: newProfile.muteApplause,
        deleted: false,
      },
    }, {
      upsert: true,
    });
  },

  linkUserGoogleAccount(key, secret) {
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

    Models.Profiles.update(this.userId, { $set: { googleAccount: email } });
  },

  unlinkUserGoogleAccount() {
    check(this.userId, String);
    Models.Profiles.update(this.userId, { $unset: { googleAccount: 1 } });
  },
});
