import { check } from "meteor/check";
import purgeHunt from "../../lib/jobs/purgeHunt";
import MeteorUsers from "../../lib/models/MeteorUsers";
import { checkAdmin } from "../../lib/permission_stubs";
import purgeHuntMethod from "../../methods/purgeHunt";
import enqueueJob from "../jobs/framework/enqueueJob";
import defineMethod from "./defineMethod";

defineMethod(purgeHuntMethod, {
  validate(arg) {
    check(arg, { huntId: String });
    return arg;
  },

  async run({ huntId }) {
    check(this.userId, String);
    checkAdmin(await MeteorUsers.findOneAsync(this.userId));

    await enqueueJob(purgeHunt, { huntId });
  },
});
