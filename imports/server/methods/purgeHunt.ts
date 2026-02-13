import { check } from "meteor/check";
import MeteorUsers from "../../lib/models/MeteorUsers";
import { checkAdmin } from "../../lib/permission_stubs";
import purgeHunt from "../../methods/purgeHunt";
import purgeHuntJob from "../jobs/purgeHunt";
import defineMethod from "./defineMethod";

defineMethod(purgeHunt, {
  validate(arg) {
    check(arg, { huntId: String });
    return arg;
  },

  async run({ huntId }) {
    check(this.userId, String);
    checkAdmin(await MeteorUsers.findOneAsync(this.userId));

    await purgeHuntJob.enqueue({ huntId });
  },
});
