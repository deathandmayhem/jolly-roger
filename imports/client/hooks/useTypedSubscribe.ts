import { useSubscribe } from "meteor/react-meteor-data";
import type z from "zod";
import type TypedPublication from "../../lib/publications/TypedPublication";

export default function useTypedSubscribe<Args extends z.AnyZodTuple>(
  publication: TypedPublication<Args> | undefined,
  ...args: z.input<Args>
) {
  return useSubscribe(publication?.name ?? undefined, ...args);
}
