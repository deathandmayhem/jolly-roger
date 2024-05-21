import { Accounts } from "meteor/accounts-base";
import { Meteor } from "meteor/meteor";
import { assert } from "chai";
import Flags from "../../../../imports/Flags";
import FeatureFlags from "../../../../imports/lib/models/FeatureFlags";
import { ModelType, Selector } from "../../../../imports/lib/models/Model";
import { USER_EMAIL, USER_PASSWORD } from "../../../acceptance/lib";

async function propagationPromise(
  query: Selector<ModelType<typeof FeatureFlags>>,
) {
  return new Promise<void>((resolve, reject) => {
    let handleThunk: Meteor.LiveQueryHandle | undefined;
    const cb = () => {
      if (handleThunk) {
        handleThunk?.stop();
        handleThunk = undefined;
        resolve();
      }
    };
    FeatureFlags.find(query)
      .observeChangesAsync({
        added: cb,
        changed: cb,
        removed: cb,
      })
      .then(
        (handle) => {
          handleThunk = handle;
        },
        (error) => {
          reject(error);
        },
      );
  });
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
      const updatePropagated = propagationPromise({ name: "test" });

      await FeatureFlags.upsertAsync(
        { name: "test" },
        {
          $set: {
            type: "off",
            createdBy: userId,
          },
        },
      );
      await updatePropagated;
      observer.stop();

      assert.equal(callCount, 1);
    });

    it("fires twice if the insertion does change state", async function () {
      let callCount = 0;
      const cb = () => {
        callCount += 1;
      };
      const observer = await Flags.observeChangesAsync("test", cb);
      const updatePropagated = propagationPromise({ name: "test" });

      await FeatureFlags.upsertAsync(
        { name: "test" },
        {
          $set: {
            type: "on",
            createdBy: userId,
          },
        },
      );
      await updatePropagated;
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
      const updatePropagated = propagationPromise({ name: "test" });

      // reset call count
      callCount = 0;

      await FeatureFlags.upsertAsync(
        { name: "test" },
        { $set: { type: "on" } },
      );
      await updatePropagated;
      observer.stop();

      assert.equal(callCount, 1);
    });
  });
});
