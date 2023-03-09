import { Meteor } from 'meteor/meteor';

declare module 'meteor/meteor' {
  namespace Meteor {
    const gitCommitHash: string;
  }
}
