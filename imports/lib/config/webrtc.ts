import { Meteor } from 'meteor/meteor';

// eslint-disable-next-line import/prefer-default-export
export const RECENT_ACTIVITY_TIME_WINDOW_MS =
  Meteor.isDevelopment ?
    // Make the timeout much faster in development for easier testing
    5 * 1000 :
    60 * 1000;
