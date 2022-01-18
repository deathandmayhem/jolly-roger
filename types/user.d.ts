declare module 'meteor/meteor' {
  module Meteor {
    interface User {
      lastLogin?: Date;
      hunts?: string[];
      roles?: Record<string, string[]>; // scope -> roles
    }
  }
}
