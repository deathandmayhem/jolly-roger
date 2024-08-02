import { promisify } from "util";
import { Accounts } from "meteor/accounts-base";
import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { assert } from "chai";
import Hunts from "../../imports/lib/models/Hunts";
import MeteorUsers from "../../imports/lib/models/MeteorUsers";
import {
  addUserToRole as serverAddUserToRole,
  huntsUserIsOperatorFor,
} from "../../imports/lib/permission_stubs";
import TypedMethod from "../../imports/methods/TypedMethod";
import resetDatabase from "../lib/resetDatabase";
import { stabilize, subscribeAsync } from "./lib";

// To make these tests easier to setup, use these methods to punch through most
// of our normal permissions. They don't even require that you be logged in.
const createUser = new TypedMethod<
  { email: string; password: string; displayName: string },
  string
>("test.methods.profiles.createUser");
const addUserToRole = new TypedMethod<
  { userId: string; scope: string; role: string },
  void
>("test.methods.profiles.addUserToRole");
const createHunt = new TypedMethod<{ name: string }, string>(
  "test.methods.profiles.createHunt",
);
const joinHunt = new TypedMethod<{ huntId: string; userId: string }, void>(
  "test.methods.profiles.joinHunt",
);

if (Meteor.isServer) {
  const defineMethod: typeof import("../../imports/server/methods/defineMethod").default =
    require("../../imports/server/methods/defineMethod").default;

  defineMethod(createUser, {
    validate(arg: unknown) {
      check(arg, {
        email: String,
        password: String,
        displayName: String,
      });

      return arg;
    },

    async run({ email, password, displayName }) {
      if (!Meteor.isAppTest) {
        throw new Meteor.Error(500, "This code must not run in production");
      }

      const userId = await Accounts.createUserAsync({ email, password });
      await MeteorUsers.updateAsync(userId, { $set: { displayName } });
      return userId;
    },
  });

  defineMethod(addUserToRole, {
    validate(arg: unknown) {
      check(arg, {
        userId: String,
        scope: String,
        role: String,
      });

      return arg;
    },

    async run({ userId, scope, role }) {
      if (!Meteor.isAppTest) {
        throw new Meteor.Error(500, "This code must not run in production");
      }

      await serverAddUserToRole(userId, scope, role);
    },
  });

  defineMethod(createHunt, {
    validate(arg: unknown) {
      check(arg, {
        name: String,
      });

      return arg;
    },

    async run({ name }) {
      if (!Meteor.isAppTest) {
        throw new Meteor.Error(500, "This code must not run in production");
      }

      // Just pick a random creator
      const u = await Meteor.users.findOneAsync();
      if (!u) {
        throw new Meteor.Error(500, "No users found");
      }

      return Hunts.insertAsync({ name, hasGuessQueue: true, createdBy: u._id });
    },
  });

  defineMethod(joinHunt, {
    validate(arg: unknown) {
      check(arg, {
        huntId: String,
        userId: String,
      });

      return arg;
    },

    async run({ huntId, userId }) {
      await MeteorUsers.updateAsync(userId, {
        $addToSet: { hunts: { $each: [huntId] } },
      });
    },
  });
}

if (Meteor.isClient) {
  describe("user profile publishes", function () {
    describe("displayNames", function () {
      it("behaves correctly", async function () {
        await resetDatabase("user profile publishes displayNames");

        const userId: string = await createUser.callPromise({
          email: "jolly-roger@deathandmayhem.com",
          password: "password",
          displayName: "U1",
        });
        const sameHuntUserId: string = await createUser.callPromise({
          email: "jolly-roger+same-hunt@deathandmayhem.com",
          password: "password",
          displayName: "U2",
        });
        const differentHuntUserId: string = await createUser.callPromise({
          email: "jolly-roger+different-hunt@deathandmayhem.com",
          password: "password",
          displayName: "U3",
        });

        const huntId: string = await createHunt.callPromise({
          name: "Test Hunt",
        });
        const otherHuntId: string = await createHunt.callPromise({
          name: "Other Hunt",
        });

        await joinHunt.callPromise({ huntId, userId });
        await joinHunt.callPromise({ huntId, userId: sameHuntUserId });
        await joinHunt.callPromise({
          huntId: otherHuntId,
          userId: differentHuntUserId,
        });

        await promisify(Meteor.loginWithPassword)(
          "jolly-roger@deathandmayhem.com",
          "password",
        );

        let huntSub = await subscribeAsync("displayNames", huntId);

        assert.sameMembers(
          await MeteorUsers.find({}, { fields: { displayName: 1 } }).mapAsync(
            (u) => u.displayName,
          ),
          ["U1", "U2"],
          "Should only show users in the same hunt",
        );

        huntSub.stop();
        await stabilize();
        huntSub = await subscribeAsync("displayNames", otherHuntId);

        assert.sameMembers(
          await MeteorUsers.find({}, { fields: { displayName: 1 } }).mapAsync(
            (u) => u.displayName,
          ),
          ["U1"],
          "Should not show users in the other hunt when not a member",
        );

        await joinHunt.callPromise({ huntId: otherHuntId, userId });
        await stabilize();

        assert.sameMembers(
          await MeteorUsers.find({}, { fields: { displayName: 1 } }).mapAsync(
            (u) => u.displayName,
          ),
          ["U1", "U3"],
          "Should update when hunt membership changes",
        );
      });
    });

    describe("allProfiles", function () {
      it("behaves correctly", async function () {
        await resetDatabase("user profile publishes allProfiles");

        const userId: string = await createUser.callPromise({
          email: "jolly-roger@deathandmayhem.com",
          password: "password",
          displayName: "U1",
        });
        const sameHuntUserId: string = await createUser.callPromise({
          email: "jolly-roger+same-hunt@deathandmayhem.com",
          password: "password",
          displayName: "U2",
        });
        const differentHuntUserId: string = await createUser.callPromise({
          email: "jolly-roger+different-hunt@deathandmayhem.com",
          password: "password",
          displayName: "U3",
        });

        const huntId: string = await createHunt.callPromise({
          name: "Test Hunt",
        });
        const otherHuntId: string = await createHunt.callPromise({
          name: "Other Hunt",
        });

        await joinHunt.callPromise({ huntId, userId });
        await joinHunt.callPromise({ huntId, userId: sameHuntUserId });
        await joinHunt.callPromise({
          huntId: otherHuntId,
          userId: sameHuntUserId,
        });
        await joinHunt.callPromise({
          huntId: otherHuntId,
          userId: differentHuntUserId,
        });

        await promisify(Meteor.loginWithPassword)(
          "jolly-roger@deathandmayhem.com",
          "password",
        );

        await subscribeAsync("allProfiles");

        let u3 = await MeteorUsers.findOneAsync(differentHuntUserId);
        assert.isUndefined(
          u3,
          "Should not show users in the other hunt when not a member",
        );

        let u2 = await MeteorUsers.findOneAsync(sameHuntUserId);
        assert.isDefined(u2, "Should show users in the same hunt");
        assert.sameMembers(
          u2.hunts!,
          [huntId],
          "Should not show membership in other hunts even if user is visible",
        );

        await joinHunt.callPromise({ huntId: otherHuntId, userId });
        await stabilize();

        u2 = await MeteorUsers.findOneAsync(sameHuntUserId);
        assert.sameMembers(
          u2!.hunts!,
          [huntId, otherHuntId],
          "Should update when hunt membership changes",
        );
        u3 = await MeteorUsers.findOneAsync(differentHuntUserId);
        assert.isDefined(
          u3,
          "Should show users in the other hunt when a member",
        );
      });
    });

    describe("huntRoles", function () {
      it("behaves correctly", async function () {
        await resetDatabase("user profile publishes huntRoles");

        const userId: string = await createUser.callPromise({
          email: "jolly-roger@deathandmayhem.com",
          password: "password",
          displayName: "U1",
        });
        const sameHuntUserId: string = await createUser.callPromise({
          email: "jolly-roger+same-hunt@deathandmayhem.com",
          password: "password",
          displayName: "U2",
        });
        const differentHuntUserId: string = await createUser.callPromise({
          email: "jolly-roger+different-hunt@deathandmayhem.com",
          password: "password",
          displayName: "U3",
        });

        const huntId: string = await createHunt.callPromise({
          name: "Test Hunt",
        });
        const otherHuntId: string = await createHunt.callPromise({
          name: "Other Hunt",
        });

        await joinHunt.callPromise({ huntId, userId });
        await joinHunt.callPromise({ huntId: otherHuntId, userId });
        await joinHunt.callPromise({ huntId, userId: sameHuntUserId });
        await joinHunt.callPromise({
          huntId: otherHuntId,
          userId: differentHuntUserId,
        });

        await addUserToRole.callPromise({
          userId,
          scope: huntId,
          role: "operator",
        });
        await addUserToRole.callPromise({
          userId: sameHuntUserId,
          scope: huntId,
          role: "operator",
        });
        await addUserToRole.callPromise({
          userId: differentHuntUserId,
          scope: otherHuntId,
          role: "operator",
        });

        await promisify(Meteor.loginWithPassword)(
          "jolly-roger@deathandmayhem.com",
          "password",
        );
        await subscribeAsync("huntRoles", huntId);
        await subscribeAsync("huntRoles", otherHuntId);

        const userIsOperatorForAnyHunt = (u: Meteor.User) =>
          huntsUserIsOperatorFor(u).size > 0;
        let operators = (await MeteorUsers.find().fetchAsync()).filter(
          userIsOperatorForAnyHunt,
        );
        assert.sameMembers(
          operators.map((u) => u._id),
          [userId, sameHuntUserId],
          "Should only show operators in hunt where you are an operator",
        );

        await addUserToRole.callPromise({
          userId,
          scope: otherHuntId,
          role: "operator",
        });
        await stabilize();

        operators = (await MeteorUsers.find().fetchAsync()).filter(
          userIsOperatorForAnyHunt,
        );
        assert.sameMembers(
          operators.map((u) => u._id),
          [userId, sameHuntUserId, differentHuntUserId],
          "Should update when hunt roles changes",
        );
      });
    });
  });
}
