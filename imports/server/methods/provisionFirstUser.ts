import { Accounts } from "meteor/accounts-base";
import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";

import { GLOBAL_SCOPE } from "../../lib/isAdmin";
import MeteorUsers from "../../lib/models/MeteorUsers";
import { addUserToRole } from "../../lib/permission_stubs";
import provisionFirstUser from "../../methods/provisionFirstUser";
import defineMethod from "./defineMethod";

defineMethod(provisionFirstUser, {
  validate(args) {
    check(args, {
      email: String,
      password: String,
    });
    return args;
  },

  async run({ email, password }) {
    // Refuse to create the user if any users already exist
    // This is theoretically racy but is probably fine in practice
    const existingUser = await MeteorUsers.findOneAsync({});
    if (existingUser) {
      throw new Meteor.Error(403, "The first user already exists.");
    }

    const firstUserId = await Accounts.createUserAsync({ email, password });
    await addUserToRole(firstUserId, GLOBAL_SCOPE, "admin");
  },
});
