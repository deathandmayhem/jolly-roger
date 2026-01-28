import { useSubscribe } from "meteor/react-meteor-data";

import type TypedPublication from "../../lib/publications/TypedPublication";
import type { TypedPublicationArgs } from "../../lib/publications/TypedPublication";
import type { TypedMethodSubscribeArgs } from "../typedSubscribe";

export default function useTypedSubscribe<T, Arg extends TypedPublicationArgs>(
  publication: TypedPublication<Arg> | undefined,
  ...args: TypedMethodSubscribeArgs<T, Arg>
) {
  return useSubscribe(publication?.name ?? undefined, ...args);
}
