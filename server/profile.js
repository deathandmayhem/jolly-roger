import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Ansible from '/imports/ansible.js';

Meteor.methods({
  saveProfile(newProfile) {
    // Allow users to update/upsert profile data.
    check(this.userId, String);
    check(newProfile, {
      displayName: String,
      phoneNumber: String,
      slackHandle: String,
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
        deleted: false,
      },
    }, {
      upsert: true,
    });
  },
});
