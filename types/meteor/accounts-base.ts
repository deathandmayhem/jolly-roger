import { Meteor } from 'meteor/meteor';

declare module 'meteor/accounts-base' {
  namespace Accounts {
    function setDefaultPublishFields(fields: Partial<Record<keyof Meteor.User, 1 | 0>>): void;
  }
}
