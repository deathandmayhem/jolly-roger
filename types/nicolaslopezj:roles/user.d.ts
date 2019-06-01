declare module 'meteor/meteor' {
  module Meteor {
    interface User {
      roles?: string[];
      getRoles(includeSpecial?: boolean): string[];
      hasRole(role: string): boolean;
    }
  }
}
