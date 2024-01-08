import type ValidateShape from "../../../../imports/lib/ValidateShape";

function validatedCall<T>(
  _arg: ValidateShape<
    T,
    {
      a: number;
      b: number;
      c?: number;
    }
  >,
): void {
  /* dummy function for type checking */
}

describe("ValidateShape", () => {
  it("rejects extra parameters", () => {
    const arg = {
      a: 1,
      b: 2,
      c: 3,
      d: 4,
    };
    // @ts-expect-error extra parameter
    validatedCall(arg);
    const arg2 = {
      a: 1,
      b: 2,
      d: 3,
    };
    // @ts-expect-error extra parameter
    validatedCall(arg2);
  });

  it("rejects missing parameters", () => {
    const arg = { a: 1 };
    // @ts-expect-error missing parameter
    validatedCall(arg);
  });

  it("accepts valid parameters", () => {
    const arg = { a: 1, b: 2 };
    validatedCall(arg);
    const arg2 = { a: 1, b: 2, c: 3 };
    validatedCall(arg2);
  });
});
