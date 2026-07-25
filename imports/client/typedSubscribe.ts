import { Meteor } from "meteor/meteor";
import type z from "zod";
import type TypedPublication from "../lib/publications/TypedPublication";
import type { ExactCallArgs } from "../lib/ValidateShape";

// oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- T must remain independently inferred so ExactCallArgs can reject excess properties
const typedSubscribe = <Args extends z.ZodTuple, T extends z.input<Args>>(
  publication: TypedPublication<Args>,
  ...args: ExactCallArgs<T, z.input<Args>>
) => {
  return Meteor.subscribe(publication.name, ...args);
};

// oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- T must remain independently inferred so ExactCallArgs can reject excess properties
typedSubscribe.async = <Args extends z.ZodTuple, T extends z.input<Args>>(
  publication: TypedPublication<Args>,
  ...args: ExactCallArgs<T, z.input<Args>>
) => {
  return new Promise<Meteor.SubscriptionHandle>((resolve, reject) => {
    const handle = Meteor.subscribe(publication.name, ...args, {
      onStop: (reason?: Meteor.Error) => {
        if (reason) {
          reject(reason);
        }
      },
      onReady: () => {
        resolve(handle);
      },
    });
  });
};

export default typedSubscribe;
