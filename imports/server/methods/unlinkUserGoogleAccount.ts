import { check } from "meteor/check";
import MeteorUsers from "../../lib/models/MeteorUsers";
import unlinkUserGoogleAccount from "../../methods/unlinkUserGoogleAccount";
import defineMethod from "./defineMethod";

defineMethod(unlinkUserGoogleAccount, {
  async run() {
    check(this.userId, String);
    await MeteorUsers.updateAsync(this.userId, {
      $unset: {
        googleAccount: 1,
        googleAccountId: 1,
      },
    });
  },
});
