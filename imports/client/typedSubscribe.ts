import { Meteor } from "meteor/meteor";
import type TypedPublication from "../lib/publications/TypedPublication";
import type { TypedPublicationArgs } from "../lib/publications/TypedPublication";
import type ValidateShape from "../lib/ValidateShape";

export type TypedMethodSubscribeArgs<
  T,
  Arg extends TypedPublicationArgs,
> = Arg extends void ? [] : [ValidateShape<T, Arg>];

const typedSubscribe = <T, Args extends TypedPublicationArgs>(
  publication: TypedPublication<Args>,
  ...args: TypedMethodSubscribeArgs<T, Args>
) => {
  return Meteor.subscribe(publication.name, ...args);
};

typedSubscribe.async = <T, Args extends TypedPublicationArgs>(
  publication: TypedPublication<Args>,
  ...args: TypedMethodSubscribeArgs<T, Args>
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
