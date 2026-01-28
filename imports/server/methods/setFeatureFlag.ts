import { check, Match } from "meteor/check";

import FeatureFlags, { FlagNames } from "../../lib/models/FeatureFlags";
import MeteorUsers from "../../lib/models/MeteorUsers";
import { checkAdmin } from "../../lib/permission_stubs";
import setFeatureFlag from "../../methods/setFeatureFlag";
import defineMethod from "./defineMethod";

defineMethod(setFeatureFlag, {
  validate(arg) {
    check(arg, {
      name: Match.OneOf(...FlagNames),
      type: Match.OneOf("off", "on"),
    });

    return arg;
  },

  async run({ name, type }) {
    // Feature flags may only be updated by admins
    check(this.userId, String);
    checkAdmin(await MeteorUsers.findOneAsync(this.userId));

    await FeatureFlags.upsertAsync({ name }, { $set: { type } });
  },
});
