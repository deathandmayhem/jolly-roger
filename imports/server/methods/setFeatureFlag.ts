import { check } from "meteor/check";
import FeatureFlags from "../../lib/models/FeatureFlags";
import MeteorUsers from "../../lib/models/MeteorUsers";
import { checkAdmin } from "../../lib/permission_stubs";
import setFeatureFlag from "../../methods/setFeatureFlag";
import defineMethod from "./defineMethod";

defineMethod(setFeatureFlag, {
  async run({ name, type }) {
    // Feature flags may only be updated by admins
    check(this.userId, String);
    checkAdmin(await MeteorUsers.findOneAsync(this.userId));

    await FeatureFlags.upsertAsync({ name }, { $set: { type } });
  },
});
