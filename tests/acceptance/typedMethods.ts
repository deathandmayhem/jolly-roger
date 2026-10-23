import { Meteor } from "meteor/meteor";
import { assert } from "chai";
import z from "zod";
import TypedMethod from "../../imports/methods/TypedMethod";

// Test-only methods
const echoName = new TypedMethod(
  "test.methods.typedMethods.echoName",
  z.tuple([z.strictObject({ name: z.string() })]),
  z.object({ name: z.string() }),
);
const misbehavedReturn = new TypedMethod(
  "test.methods.typedMethods.misbehavedReturn",
  z.tuple([]),
  z.string(),
);

if (Meteor.isServer) {
  const defineMethod: typeof import("../../imports/server/methods/defineMethod").default =
    require("../../imports/server/methods/defineMethod").default;

  defineMethod(echoName, {
    run({ name }) {
      if (!Meteor.isAppTest) {
        throw new Meteor.Error(500, "This code must not run in production");
      }

      // Intentionally include an extra field so we can prove it gets stripped over the wire
      return { name, secret: "do not leak" };
    },
  });

  defineMethod(misbehavedReturn, {
    // @ts-expect-error deliberately malformed; the client should see an
    // opaque 500
    run() {
      if (!Meteor.isAppTest) {
        throw new Meteor.Error(500, "This code must not run in production");
      }

      return 42;
    },
  });
}

if (Meteor.isClient) {
  describe("TypedMethod wire contract", function () {
    it("rejects extra argument properties with a sanitized 400", async function () {
      let error: Meteor.Error | undefined;
      try {
        // @ts-expect-error intentional extra property to test validation
        await echoName.callPromise({ name: "x", extra: 1 });
      } catch (e) {
        error = e as Meteor.Error;
      }
      assert.isDefined(error);
      assert.equal(error.error, 400);
      assert.equal(
        error.reason,
        "Invalid arguments to method test.methods.typedMethods.echoName",
      );
      // zod's issue details must not survive sanitization
      assert.notMatch(JSON.stringify(error), /unrecognized_keys|issues/);
    });

    it("rejects extra arguments with a sanitized 400", async function () {
      let error: Meteor.Error | undefined;
      try {
        await Meteor.callAsync(echoName.name, { name: "x" }, 2);
      } catch (e) {
        error = e as Meteor.Error;
      }
      assert.isDefined(error);
      assert.equal(error.error, 400);
    });

    it("converts a malformed return value into an opaque 500", async function () {
      let error: Meteor.Error | undefined;
      try {
        await misbehavedReturn.callPromise();
      } catch (e) {
        error = e as Meteor.Error;
      }
      assert.isDefined(error);
      assert.equal(error.error, 500);
      assert.equal(error.reason, "Internal server error");
    });

    it("strips undeclared fields from return values", async function () {
      const result = await echoName.callPromise({ name: "x" });
      assert.deepEqual(result, { name: "x" });
    });
  });
}
