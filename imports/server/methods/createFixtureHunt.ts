import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import FixtureHunt from "../../FixtureHunt";
import MeteorUsers from "../../lib/models/MeteorUsers";
import { addUserToRoles, userMayCreateHunt } from "../../lib/permission_stubs";
import createFixtureHunt from "../../methods/createFixtureHunt";
import makeFixtureHunt from "../makeFixtureHunt";
import defineMethod from "./defineMethod";

defineMethod(createFixtureHunt, {
  async run() {
    check(this.userId, String);

    if (!userMayCreateHunt(await MeteorUsers.findOneAsync(this.userId))) {
      throw new Meteor.Error(401, "Must be allowed to create hunt");
    }

    await makeFixtureHunt(this.userId);

    // Make the user an operator
    await MeteorUsers.updateAsync(this.userId, {
      $addToSet: { hunts: FixtureHunt._id },
    });
    await addUserToRoles(this.userId, FixtureHunt._id, [
      "hunt_owner",
      "operator",
    ]);
  },
});
