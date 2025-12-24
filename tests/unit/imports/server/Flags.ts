import { setImmediate } from "node:timers/promises";
import { Accounts } from "meteor/accounts-base";
import { MongoInternals } from "meteor/mongo";
import { assert } from "chai";
import Flags from "../../../../imports/Flags";
import FeatureFlags from "../../../../imports/lib/models/FeatureFlags";
import { USER_EMAIL, USER_PASSWORD } from "../../../acceptance/lib";

declare module "meteor/mongo" {
  namespace MongoInternals {
    interface MongoConnection {
      _oplogHandle: {
        waitUntilCaughtUp: () => Promise<void>;
      } | null;
    }
  }
}

async function waitUntilOplogCaughtUp() {
  const oplogHandle =
    MongoInternals.defaultRemoteCollectionDriver().mongo._oplogHandle;
  if (!oplogHandle) {
    throw new Error("Oplog handle not found");
  }
  await oplogHandle.waitUntilCaughtUp();

  // Wait an extra tick to ensure any observers have fired
  await setImmediate();
}

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

      await FeatureFlags.upsertAsync(
        { name: "test" },
        {
          $set: {
            type: "off",
            createdBy: userId,
          },
        },
      );
      await waitUntilOplogCaughtUp();
      observer.stop();

      assert.equal(callCount, 1);
    });

    it("fires twice if the insertion does change state", async function () {
      let callCount = 0;
      const cb = () => {
        callCount += 1;
      };
      const observer = await Flags.observeChangesAsync("test", cb);

      await FeatureFlags.upsertAsync(
        { name: "test" },
        {
          $set: {
            type: "on",
            createdBy: userId,
          },
        },
      );
      await waitUntilOplogCaughtUp();
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

      await FeatureFlags.upsertAsync(
        { name: "test" },
        { $set: { type: "on" } },
      );
      await waitUntilOplogCaughtUp();
      observer.stop();

      assert.equal(callCount, 1);
    });
  });
});
