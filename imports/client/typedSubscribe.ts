import { Meteor } from "meteor/meteor";
import type z from "zod";
import type TypedPublication from "../lib/publications/TypedPublication";

const typedSubscribe = <Args extends z.AnyZodTuple>(
  publication: TypedPublication<Args>,
  ...args: z.input<Args>
) => {
  return Meteor.subscribe(publication.name, ...args);
};

typedSubscribe.async = <Args extends z.AnyZodTuple>(
  publication: TypedPublication<Args>,
  ...args: z.input<Args>
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
