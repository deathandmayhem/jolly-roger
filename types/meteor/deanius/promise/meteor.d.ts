declare module 'meteor/meteor' {
  module Meteor {
    interface SubscriptionHandle {
      readyPromise(): Promise<true>;
    }

    function callPromise(name: string, ...args: any[]): Promise<any>;
    function wrapPromise<Args extends any[], Error, Return>(
      fn: (...args: [
        ...Args,
        (err: Error, val: Return) => void
      ]) => void): (...args: Args) => Promise<Return>;
    function wrapPromise<Args extends any[], Error>(
      fn: (...args: [
        ...Args,
        (err: Error) => void
      ]) => void): (...args: Args) => Promise<void>;
  }
}
