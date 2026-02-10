import isAdmin from "../../lib/isAdmin";
import Jobs from "../../lib/models/Jobs";
import MeteorUsers from "../../lib/models/MeteorUsers";
import jobsAll from "../../lib/publications/jobsAll";
import definePublication from "./definePublication";

definePublication(jobsAll, {
  async run() {
    if (!this.userId || !isAdmin(await MeteorUsers.findOneAsync(this.userId))) {
      return [];
    }

    return Jobs.find({});
  },
});
