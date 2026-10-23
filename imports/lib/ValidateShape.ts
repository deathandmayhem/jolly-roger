type ValidateShape<T, Shape> = Shape extends undefined
  ? undefined
  : Shape & {
      [K in keyof T]: K extends keyof Shape ? T[K] : never;
    };

// tuple mapped types expose fixed indices as string keys, so the first branch
// converts a key like "2" back to the numeric index 2; the second branch handles
// keys that are already numeric, including the unspecified `number` used for
// rest elements.
type TupleElement<
  S extends readonly unknown[],
  K,
> = K extends `${infer N extends number}`
  ? S[N]
  : K extends number
    ? S[K]
    : never;

// map over `T` (the supplied argument tuple) rather than `S` (the expected
// argument tuple) so TypeScript infers each supplied element before applying
// `ValidateShape`. Wrap and spread so that the result is interpreted as a tuple
export type ExactCallArgs<T extends S, S extends readonly unknown[]> = [
  ...{
    [K in keyof T]: ValidateShape<T[K], TupleElement<S, K>>;
  },
];

export default ValidateShape;
