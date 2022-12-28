import { check } from 'meteor/check';
import Ansible from '../../Ansible';
import MeteorUsers from '../../lib/models/MeteorUsers';
import updateProfile from '../../methods/updateProfile';

updateProfile.define({
  validate(arg) {
    check(arg, {
      displayName: String,
      phoneNumber: String,
      dingwords: [String],
    });

    return arg;
  },

  run({
    displayName,
    phoneNumber,
    dingwords,
  }) {
    // Allow users to update/upsert profile data.
    check(this.userId, String);

    Ansible.log('Updating profile for user', { user: this.userId });
    await MeteorUsers.updateAsync({
      _id: this.userId,
    }, {
      $set: {
        displayName,
        phoneNumber,
        dingwords,
      },
    });
  },
});
