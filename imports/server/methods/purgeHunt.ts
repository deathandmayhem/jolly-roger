import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import purgeHunt from "../../lib/jobs/purgeHunt";
import Hunts from "../../lib/models/Hunts";
import MeteorUsers from "../../lib/models/MeteorUsers";
import { userMayPurgeHunt } from "../../lib/permission_stubs";
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
    const caller = await MeteorUsers.findOneAsync(this.userId);
    const hunt = await Hunts.findOneAsync(huntId);

    if (!userMayPurgeHunt(caller, hunt)) {
      throw new Meteor.Error(
        401,
        `User ${this.userId} may not purge hunt ${huntId}`,
      );
    }

    await enqueueJob(purgeHunt, { huntId });
  },
});
