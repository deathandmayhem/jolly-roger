declare module 'meteor/meteor' {
  module Meteor {
    interface User {
      roles?: string[];
    }
  }
}
