import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import Ansible from '../../Ansible';
import MeteorUsers from '../../lib/models/MeteorUsers';
import updateProfile from '../../methods/updateProfile';

updateProfile.define({
  validate(arg) {
    check(arg, {
      displayName: String,
      phoneNumber: Match.Optional(String),
      dingwords: [String],
    });

    return arg;
  },

  async run({
    displayName,
    phoneNumber,
    dingwords,
  }) {
    // Allow users to update/upsert profile data.
    check(this.userId, String);

    if (!displayName || displayName.match(/^\s/)) {
      throw new Meteor.Error(400, 'Display name is required and cannot begin with whitespace');
    }

    const unset = { phoneNumber: phoneNumber ? 1 : undefined } as const;

    Ansible.log('Updating profile for user', { user: this.userId });
    await MeteorUsers.updateAsync({
      _id: this.userId,
    }, {
      $set: {
        displayName,
        phoneNumber,
        dingwords,
      },
      $unset: unset,
    });
  },
});
