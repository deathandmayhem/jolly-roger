import z from "zod";
import typedSubscribe from "../../../../imports/client/typedSubscribe";
import TypedPublication from "../../../../imports/lib/publications/TypedPublication";

describe("TypedPublication", () => {
  // The arrow below is never invoked: we only need the compiler to check
  // these declarations and calls.
  it("constrains default publications to empty argument tuples", () => {
    void (() => {
      const namedWithoutArgs = new TypedPublication("named", z.tuple([]));
      const namedWithArgs = new TypedPublication(
        "named",
        z.tuple([z.string()]),
      );
      const defaultPublication = new TypedPublication(null, z.tuple([]));

      typedSubscribe(namedWithoutArgs);
      typedSubscribe(namedWithArgs, "argument");

      // @ts-expect-error default publications cannot accept arguments
      void new TypedPublication(null, z.tuple([z.string()]));

      // @ts-expect-error default publications cannot be subscribed to by name
      typedSubscribe(defaultPublication);
      // @ts-expect-error default publications cannot be subscribed to by name
      void typedSubscribe.async(defaultPublication);
    });
  });
});
