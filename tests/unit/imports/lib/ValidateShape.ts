/* eslint jolly-roger/no-disallowed-sync-methods: "off" -- we are deliberately exercising the .call() signature */
import { assert } from "chai";
import z from "zod";
import TypedMethod from "../../../../imports/methods/TypedMethod";

const testMethod = new TypedMethod(
  "Test.methods.validateShape",
  z.tuple([
    z.strictObject({
      a: z.number(),
      b: z.number(),
      c: z.number().optional(),
    }),
  ]),
  z.void(),
);

const zeroArgMethod = new TypedMethod(
  "Test.methods.validateShapeZeroArgs",
  z.tuple([]),
  z.void(),
);

const multiArgMethod = new TypedMethod(
  "Test.methods.validateShapeMultiArgs",
  z.tuple([
    z.strictObject({ id: z.string() }),
    z.strictObject({ enabled: z.boolean() }).optional(),
  ]),
  z.void(),
);

const restArgMethod = new TypedMethod(
  "Test.methods.validateShapeRestArgs",
  z.tuple(
    [z.strictObject({ id: z.string() })],
    z.strictObject({ value: z.number() }),
  ),
  z.void(),
);

describe("ValidateShape", () => {
  // The arrows below are never invoked: we only need the compiler to check
  // these calls (and reject the @ts-expect-error ones), and running them
  // would issue actual Meteor method calls.
  it("rejects extra parameters", () => {
    void (() => {
      const arg = { a: 1, b: 2, c: 3, d: 4 };
      // @ts-expect-error extra parameter
      void testMethod.callPromise(arg);

      const arg2 = { a: 1, b: 2, d: 3 };
      // @ts-expect-error extra parameter
      void testMethod.callPromise(arg2);

      // @ts-expect-error extra parameter via spread
      void testMethod.callPromise({ ...arg2 });

      // @ts-expect-error extra parameter alongside a callback
      testMethod.call(arg2, (error) => {
        assert.isUndefined(error);
      });

      void multiArgMethod.callPromise(
        { id: "test" },
        // @ts-expect-error extra parameter in a second tuple element
        { enabled: true, extra: true },
      );

      void restArgMethod.callPromise(
        { id: "test" },
        { value: 1 },
        // @ts-expect-error extra parameter in a rest tuple element
        { value: 2, extra: true },
      );
    });
  });

  it("rejects missing parameters", () => {
    void (() => {
      const arg = { a: 1 };
      // @ts-expect-error missing parameter
      void testMethod.callPromise(arg);
    });
  });

  it("accepts valid parameters", () => {
    void (() => {
      void testMethod.callPromise({ a: 1, b: 2 });
      void testMethod.callPromise({ a: 1, b: 2, c: 3 });

      const arg = { a: 1, b: 2 };
      void testMethod.callPromise(arg);
      const arg2 = { a: 1, b: 2, c: 3 };
      void testMethod.callPromise(arg2);

      testMethod.call({ a: 1, b: 2 });
      testMethod.call(arg, (error) => {
        assert.isUndefined(error);
      });

      void zeroArgMethod.callPromise();
      zeroArgMethod.call();
      zeroArgMethod.call((error) => {
        assert.isUndefined(error);
      });

      void multiArgMethod.callPromise({ id: "test" });
      void multiArgMethod.callPromise({ id: "test" }, { enabled: true });
      void multiArgMethod.callPromise({ id: "test" }, undefined);
      multiArgMethod.call({ id: "test" }, { enabled: true }, (error) => {
        assert.isUndefined(error);
      });

      void restArgMethod.callPromise({ id: "test" });
      void restArgMethod.callPromise(
        { id: "test" },
        { value: 1 },
        { value: 2 },
      );
      restArgMethod.call({ id: "test" }, { value: 1 }, (error) => {
        assert.isUndefined(error);
      });
    });
  });
});
