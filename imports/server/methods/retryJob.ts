import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import Jobs from "../../lib/models/Jobs";
import MeteorUsers from "../../lib/models/MeteorUsers";
import { checkAdmin } from "../../lib/permission_stubs";
import retryJob from "../../methods/retryJob";
import defineMethod from "./defineMethod";

defineMethod(retryJob, {
  validate(arg) {
    check(arg, { jobId: String });
    return arg;
  },

  async run({ jobId }) {
    check(this.userId, String);
    checkAdmin(await MeteorUsers.findOneAsync(this.userId));

    const updated = await Jobs.updateAsync(
      { _id: jobId, status: "failed" },
      {
        $set: { status: "pending", attempts: 0 },
        $unset: {
          claimedBy: 1,
          claimedAt: 1,
          completedAt: 1,
          error: 1,
          result: 1,
          runAfter: 1,
        },
      },
    );

    if (updated === 0) {
      throw new Meteor.Error(404, "Job not found or not in failed state");
    }
  },
});
