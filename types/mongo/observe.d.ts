import { Meteor } from 'meteor/meteor';

declare module 'meteor/mongo' {
  module Mongo {
    interface TypedObserveCallbacks<T> {
      added?(document: T): void;
      addedAt?(document: T, atIndex: number, before: string | null): void;
      changed?(newDocument: T, oldDocument: T): void;
      changedAt?(newDocument: T, oldDocument: T, indexAt: number): void;
      removed?(oldDocument: T): void;
      removedAt?(oldDocument: T, atIndex: number): void;
      movedTo?(document: T, fromIndex: number, toIndex: number, before: string | null): void;
    }
    interface Cursor<T> {
      observe(callbacks: TypedObserveCallbacks<T>): Meteor.LiveQueryHandle;
    }
  }
}
