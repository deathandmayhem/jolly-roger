import isAdmin from "../../lib/isAdmin";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Settings from "../../lib/models/Settings";
import settingsByName from "../../lib/publications/settingsByName";
import definePublication from "./definePublication";

definePublication(settingsByName, {
  async run({ name }) {
    // Only allow admins to pull down Settings.
    if (!this.userId || !isAdmin(await MeteorUsers.findOneAsync(this.userId))) {
      return [];
    }

    return Settings.find({ name: name as any });
  },
});
