import { check } from "meteor/check";
import isAdmin from "../../lib/isAdmin";
import Jobs from "../../lib/models/Jobs";
import MeteorUsers from "../../lib/models/MeteorUsers";
import jobForMerge from "../../lib/publications/jobForMerge";
import definePublication from "./definePublication";

definePublication(jobForMerge, {
  validate(arg) {
    check(arg, { jobId: String });
    return arg;
  },

  async run({ jobId }) {
    if (!this.userId) {
      return [];
    }

    const caller = await MeteorUsers.findOneAsync(this.userId);
    const filter = isAdmin(caller)
      ? { _id: jobId }
      : { _id: jobId, createdBy: this.userId };

    return Jobs.find(filter);
  },
});
