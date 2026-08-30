import { assert } from "chai";
import { GLOBAL_SCOPE } from "../../../../imports/lib/isAdmin";
import { userMayWritePuzzlesForAnyHunt } from "../../../../imports/lib/permission_stubs";

describe("permission_stubs", function () {
  describe("userMayWritePuzzlesForAnyHunt", function () {
    it("returns false for null or undefined user", function () {
      assert.isFalse(userMayWritePuzzlesForAnyHunt(null));
      assert.isFalse(userMayWritePuzzlesForAnyHunt(undefined));
    });

    it("returns false when user has no roles or only non-operator roles", function () {
      assert.isFalse(userMayWritePuzzlesForAnyHunt({ roles: {} }));
      assert.isFalse(
        userMayWritePuzzlesForAnyHunt({
          roles: {
            "hunt-1": ["hunter"],
            "hunt-2": ["member"],
          },
        }),
      );
    });

    it("returns true for global admin", function () {
      assert.isTrue(
        userMayWritePuzzlesForAnyHunt({
          roles: {
            [GLOBAL_SCOPE]: ["admin"],
          },
        }),
      );
    });

    it("returns true when user is an operator for at least one hunt", function () {
      assert.isTrue(
        userMayWritePuzzlesForAnyHunt({
          roles: {
            "hunt-1": ["operator"],
          },
        }),
      );
      assert.isTrue(
        userMayWritePuzzlesForAnyHunt({
          roles: {
            "hunt-1": ["hunter"],
            "hunt-2": ["operator"],
          },
        }),
      );
    });
  });
});
