import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import Jobs from "../../lib/models/Jobs";
import MeteorUsers from "../../lib/models/MeteorUsers";
import { checkAdmin } from "../../lib/permission_stubs";
import cancelJob from "../../methods/cancelJob";
import defineMethod from "./defineMethod";

defineMethod(cancelJob, {
  validate(arg) {
    check(arg, { jobId: String });
    return arg;
  },

  async run({ jobId }) {
    check(this.userId, String);
    checkAdmin(await MeteorUsers.findOneAsync(this.userId));

    const updated = await Jobs.updateAsync(
      { _id: jobId, status: "pending" },
      {
        $set: {
          status: "failed",
          completedAt: new Date(),
          error: "Cancelled by admin",
        },
        $unset: { runAfter: 1 },
      },
    );

    if (updated === 0) {
      throw new Meteor.Error(404, "Job not found or not in pending state");
    }
  },
});
