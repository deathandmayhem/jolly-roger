import { Meteor } from 'meteor/meteor';

declare module 'meteor/meteor' {
  module Meteor {
    interface User {
      lastLogin?: Date;
      roles?: string[];
      hunts: string[];
    }
  }
}
