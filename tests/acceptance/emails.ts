import { promisify } from "node:util";
import { Accounts } from "meteor/accounts-base";
import { Meteor } from "meteor/meteor";
import { assert } from "chai";
import z from "zod";
import Hunts from "../../imports/lib/models/Hunts";
import MeteorUsers from "../../imports/lib/models/MeteorUsers";
import addUserAccountEmail from "../../imports/methods/addUserAccountEmail";
import makeUserEmailPrimary from "../../imports/methods/makeUserEmailPrimary";
import removeUserAccountEmail from "../../imports/methods/removeUserAccountEmail";
import sendUserVerificationEmail from "../../imports/methods/sendUserVerificationEmail";
import TypedMethod from "../../imports/methods/TypedMethod";
import resetDatabase from "../lib/resetDatabase";
import { subscribeAsync } from "./lib";

// Test-only helper methods
const createUser = new TypedMethod(
  "test.methods.emails.createUser",
  z.tuple([
    z.strictObject({
      email: z.string(),
      password: z.string(),
      displayName: z.string(),
    }),
  ]),
  z.string(),
);
const createHunt = new TypedMethod(
  "test.methods.emails.createHunt",
  z.tuple([z.strictObject({ name: z.string() })]),
  z.string(),
);
const joinHunt = new TypedMethod(
  "test.methods.emails.joinHunt",
  z.tuple([z.strictObject({ huntId: z.string(), userId: z.string() })]),
  z.void(),
);
const verifyUserEmail = new TypedMethod(
  "test.methods.emails.verifyUserEmail",
  z.tuple([z.strictObject({ userId: z.string(), email: z.string() })]),
  z.void(),
);

if (Meteor.isServer) {
  const defineMethod: typeof import("../../imports/server/methods/defineMethod").default =
    require("../../imports/server/methods/defineMethod").default;

  defineMethod(createUser, {
    async run({ email, password, displayName }) {
      if (!Meteor.isAppTest) {
        throw new Meteor.Error(500, "This code must not run in production");
      }

      const userId = await Accounts.createUserAsync({ email, password });
      await MeteorUsers.updateAsync(userId, { $set: { displayName } });
      return userId;
    },
  });

  defineMethod(createHunt, {
    async run({ name }) {
      if (!Meteor.isAppTest) {
        throw new Meteor.Error(500, "This code must not run in production");
      }

      const u = await Meteor.users.findOneAsync();
      if (!u) {
        throw new Meteor.Error(500, "No users found");
      }

      return Hunts.insertAsync({ name, hasGuessQueue: true, createdBy: u._id });
    },
  });

  defineMethod(joinHunt, {
    async run({ huntId, userId }) {
      if (!Meteor.isAppTest) {
        throw new Meteor.Error(500, "This code must not run in production");
      }

      await MeteorUsers.updateAsync(userId, {
        $addToSet: { hunts: { $each: [huntId] } },
      });
    },
  });

  defineMethod(verifyUserEmail, {
    async run({ userId, email }) {
      if (!Meteor.isAppTest) {
        throw new Meteor.Error(500, "This code must not run in production");
      }

      const result = await MeteorUsers.updateAsync(
        { _id: userId, "emails.address": email },
        { $set: { "emails.$.verified": true } },
      );
      if (result === 0) {
        throw new Meteor.Error(400, "Email not found on user");
      }
    },
  });
}

if (Meteor.isClient) {
  describe("email management methods", function () {
    it("can add an email", async function () {
      await resetDatabase("email management add email");

      await createUser.callPromise({
        email: "primary@example.com",
        password: "password",
        displayName: "Test User",
      });

      await promisify(Meteor.loginWithPassword)(
        "primary@example.com",
        "password",
      );

      await addUserAccountEmail.callPromise({ email: "second@example.com" });

      const user = await MeteorUsers.findOneAsync(Meteor.userId()!);
      assert.isDefined(user);
      assert.lengthOf(user.emails!, 2);
      assert.equal(user.emails![1]!.address, "second@example.com");
      assert.isFalse(user.emails![1]!.verified);
    });

    it("can make a verified email primary", async function () {
      await resetDatabase("email management make primary");

      const userId = await createUser.callPromise({
        email: "primary@example.com",
        password: "password",
        displayName: "Test User",
      });

      await promisify(Meteor.loginWithPassword)(
        "primary@example.com",
        "password",
      );

      await addUserAccountEmail.callPromise({ email: "second@example.com" });
      await verifyUserEmail.callPromise({
        userId,
        email: "second@example.com",
      });

      await makeUserEmailPrimary.callPromise({ email: "second@example.com" });

      const user = await MeteorUsers.findOneAsync(userId);
      assert.equal(user!.emails![0]!.address, "second@example.com");
      assert.equal(user!.emails![1]!.address, "primary@example.com");
    });

    it("cannot make unverified email primary", async function () {
      await resetDatabase("email management unverified primary");

      await createUser.callPromise({
        email: "primary@example.com",
        password: "password",
        displayName: "Test User",
      });

      await promisify(Meteor.loginWithPassword)(
        "primary@example.com",
        "password",
      );

      await addUserAccountEmail.callPromise({ email: "second@example.com" });

      await assert.isRejected(
        makeUserEmailPrimary.callPromise({ email: "second@example.com" }),
        "Cannot make unverified email primary",
      );
    });

    it("can remove a secondary email", async function () {
      await resetDatabase("email management remove secondary");

      await createUser.callPromise({
        email: "primary@example.com",
        password: "password",
        displayName: "Test User",
      });

      await promisify(Meteor.loginWithPassword)(
        "primary@example.com",
        "password",
      );

      await addUserAccountEmail.callPromise({ email: "second@example.com" });

      await removeUserAccountEmail.callPromise({ email: "second@example.com" });

      const user = await MeteorUsers.findOneAsync(Meteor.userId()!);
      assert.lengthOf(user!.emails!, 1);
      assert.equal(user!.emails![0]!.address, "primary@example.com");
    });

    it("cannot remove primary email", async function () {
      await resetDatabase("email management remove primary");

      await createUser.callPromise({
        email: "primary@example.com",
        password: "password",
        displayName: "Test User",
      });

      await promisify(Meteor.loginWithPassword)(
        "primary@example.com",
        "password",
      );

      await assert.isRejected(
        removeUserAccountEmail.callPromise({ email: "primary@example.com" }),
        "Cannot remove primary email",
      );
    });

    it("rate-limits verification email sending", async function () {
      await resetDatabase("email management rate limit");

      await createUser.callPromise({
        email: "primary@example.com",
        password: "password",
        displayName: "Test User",
      });

      await promisify(Meteor.loginWithPassword)(
        "primary@example.com",
        "password",
      );

      // Adding an email sends a verification email, creating a token
      await addUserAccountEmail.callPromise({ email: "second@example.com" });

      // Immediately requesting another verification email should be rate-limited
      await assert.isRejected(
        sendUserVerificationEmail.callPromise({ email: "second@example.com" }),
        "Please wait before requesting another verification email",
      );
    });

    it("only publishes primary email to other users", async function () {
      await resetDatabase("email management publication privacy");

      const userAId = await createUser.callPromise({
        email: "usera@example.com",
        password: "password",
        displayName: "User A",
      });

      const userBId = await createUser.callPromise({
        email: "userb@example.com",
        password: "password",
        displayName: "User B",
      });

      const huntId = await createHunt.callPromise({ name: "Test Hunt" });

      // Log in as user A to add a second email
      await promisify(Meteor.loginWithPassword)(
        "usera@example.com",
        "password",
      );
      await addUserAccountEmail.callPromise({
        email: "usera-second@example.com",
      });

      // Join both users to the hunt (need to be logged in to see each other)
      await joinHunt.callPromise({ huntId, userId: userAId });
      await joinHunt.callPromise({ huntId, userId: userBId });

      // Log in as user B
      await promisify(Meteor.logout)();
      await promisify(Meteor.loginWithPassword)(
        "userb@example.com",
        "password",
      );

      const sub = await subscribeAsync("allProfiles");

      const userA = await MeteorUsers.findOneAsync(userAId);
      assert.isDefined(userA, "User A should be visible to User B");
      assert.lengthOf(
        userA.emails!,
        1,
        "Should only see one email for other user",
      );
      assert.equal(userA.emails![0]!.address, "usera@example.com");

      sub.stop();
    });
  });
}
