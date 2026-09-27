import { assert } from "chai";
import { stringifyMethodArgs } from "../../../../imports/methods/TypedMethod";

describe("stringifyMethodArgs", () => {
  it("returns undefined for non-objects or falsy values", () => {
    assert.isUndefined(stringifyMethodArgs(undefined));
    assert.isUndefined(stringifyMethodArgs(null));
    assert.isUndefined(stringifyMethodArgs(123));
    assert.isUndefined(stringifyMethodArgs("string"));
    assert.isUndefined(stringifyMethodArgs(true));
  });

  it("serializes normal objects as JSON", () => {
    assert.equal(
      stringifyMethodArgs({ foo: "bar", count: 42 }),
      JSON.stringify({ foo: "bar", count: 42 }),
    );
  });

  it("masks Uint8Array binary fields with their size", () => {
    for (const size of [0, 1, 2, 3, 4, 5]) {
      const data = new Uint8Array(size);
      const stringified = stringifyMethodArgs({
        name: "avatar",
        data,
      });
      assert.isDefined(stringified);
      const parsed = JSON.parse(stringified);
      assert.deepEqual(parsed, {
        name: "avatar",
        data: { $binary: `<${size} bytes>` },
      });
    }
  });

  it("masks nested Uint8Array binary fields", () => {
    const data = new Uint8Array(1024);
    const stringified = stringifyMethodArgs({
      nested: {
        file: {
          data,
        },
      },
    });
    assert.isDefined(stringified);
    const parsed = JSON.parse(stringified);
    assert.deepEqual(parsed, {
      nested: {
        file: {
          data: { $binary: "<1024 bytes>" },
        },
      },
    });
  });
});
