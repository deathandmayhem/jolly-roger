import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import FixtureHunt from "../../FixtureHunt";
import { FixtureHunt2 } from "../../FixtureHunt";
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

defineMethod(new TypedMethod<void, void>("Hunts.methods.createGroupingDemo"), {
  async run() {
    check(this.userId, String);

    if (!userMayCreateHunt(await MeteorUsers.findOneAsync(this.userId))) {
      throw new Meteor.Error(401, "Must be allowed to create hunt");
    }

    await makeFixtureHunt(this.userId, FixtureHunt2);

    // Make the user an operator
    await MeteorUsers.updateAsync(this.userId, {
      $addToSet: { hunts: FixtureHunt2._id },
    });
    await addUserToRole(this.userId, FixtureHunt2._id, "operator");
  },
});
