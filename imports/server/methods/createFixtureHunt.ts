import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import FixtureHunt from "../../FixtureHunt";
import MeteorUsers from "../../lib/models/MeteorUsers";
import { addUserToRole, userMayCreateHunt } from "../../lib/permission_stubs";
import createFixtureHunt from "../../methods/createFixtureHunt";
import makeFixtureHunt from "../makeFixtureHunt";
import defineMethod from "./defineMethod";
import TypedMethod from "../../methods/TypedMethod";

defineMethod(createFixtureHunt, {
  async run() {
    check(this.userId, String);

    if (!userMayCreateHunt(await MeteorUsers.findOneAsync(this.userId))) {
      throw new Meteor.Error(401, "Must be allowed to create hunt");
    }

    await makeFixtureHunt(this.userId, FixtureHunt);

    // Make the user an operator
    await MeteorUsers.updateAsync(this.userId, {
      $addToSet: { hunts: FixtureHunt._id },
    });
    await addUserToRole(this.userId, FixtureHunt._id, "operator");
  },
});
