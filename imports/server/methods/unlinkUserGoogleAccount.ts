import { check } from 'meteor/check';
import MeteorUsers from '../../lib/models/MeteorUsers';
import unlinkUserGoogleAccount from '../../methods/unlinkUserGoogleAccount';

unlinkUserGoogleAccount.define({
  run() {
    check(this.userId, String);
    MeteorUsers.update(this.userId, { $unset: { googleAccount: 1 } });
  },
});
