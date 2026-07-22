import { Accounts } from "meteor/accounts-base";
import { assert } from "chai";
import Flags from "../../../../imports/Flags";
import FeatureFlags from "../../../../imports/lib/models/FeatureFlags";
import { USER_EMAIL, USER_PASSWORD } from "../../../acceptance/lib";
import withWriteFence from "../../../lib/withWriteFence";

describe("Flags", function () {
  describe("observeChanges", function () {
    let userId: string;
    this.beforeAll(async function () {
      // Since FeatureFlags uses `withUsers`, we need at least one user to use for createdBy
      userId = await Accounts.createUserAsync({
        email: USER_EMAIL,
        password: USER_PASSWORD,
      });
    });

    it("fires once if the flag does not exist", async function () {
      let callCount = 0;
      const cb = () => {
        callCount += 1;
      };
      const observer = await Flags.observeChangesAsync("test", cb);
      observer.stop();

      assert.equal(callCount, 1);
    });

    it("fires once if the flag is inserted but does not change state", async function () {
      let callCount = 0;
      const cb = () => {
        callCount += 1;
      };
      const observer = await Flags.observeChangesAsync("test", cb);

      await withWriteFence(async () => {
        await FeatureFlags.upsertAsync(
          { name: "test" },
          {
            $set: {
              type: "off",
              createdBy: userId,
            },
          },
        );
      });
      observer.stop();

      assert.equal(callCount, 1);
    });

    it("fires twice if the insertion does change state", async function () {
      let callCount = 0;
      const cb = () => {
        callCount += 1;
      };
      const observer = await Flags.observeChangesAsync("test", cb);

      await withWriteFence(async () => {
        await FeatureFlags.upsertAsync(
          { name: "test" },
          {
            $set: {
              type: "on",
              createdBy: userId,
            },
          },
        );
      });
      observer.stop();

      assert.equal(callCount, 2);
    });

    it("fires if flag changes state", async function () {
      await FeatureFlags.upsertAsync(
        { name: "test" },
        {
          $set: {
            type: "off",
            createdBy: userId,
          },
        },
      );

      let callCount = 0;
      const cb = () => {
        callCount += 1;
      };
      const observer = await Flags.observeChangesAsync("test", cb);

      // reset call count
      callCount = 0;

      await withWriteFence(async () => {
        await FeatureFlags.upsertAsync(
          { name: "test" },
          { $set: { type: "on" } },
        );
      });
      observer.stop();

      assert.equal(callCount, 1);
    });
  });
});
