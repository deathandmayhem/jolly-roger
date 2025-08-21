import type { Meteor } from "meteor/meteor";

declare module "meteor/mongo" {
  namespace Mongo {
    interface Cursor<T, U = T> {
      // Added in Meteor 2.16 ; remove when @types/meteor knows about them
      observeAsync(
        callbacks: ObserveCallbacks<U>,
      ): Promise<Meteor.LiveQueryHandle>;
      observeChangesAsync(
        callbacks: ObserveChangesCallbacks<T>,
        options?: { nonMutatingCallbacks?: boolean | undefined },
      ): Promise<Meteor.LiveQueryHandle>;
    }
  }
}
