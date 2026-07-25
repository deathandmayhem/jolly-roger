import { useSubscribe } from "meteor/react-meteor-data";
import type z from "zod";
import type TypedPublication from "../../lib/publications/TypedPublication";
import type { ExactCallArgs } from "../../lib/ValidateShape";

export default function useTypedSubscribe<
  Args extends z.ZodTuple,
  // oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- T must remain independently inferred so ExactCallArgs can reject excess properties
  T extends z.input<Args>,
>(
  publication: TypedPublication<Args> | undefined,
  ...args: ExactCallArgs<T, z.input<Args>>
) {
  return useSubscribe(publication?.name ?? undefined, ...args);
}
