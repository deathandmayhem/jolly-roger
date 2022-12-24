import { Meteor } from 'meteor/meteor';

// eslint-disable-next-line import/prefer-default-export
export const ACTIVITY_GRANULARITY = Meteor.isDevelopment ?
  // Set granularity to be quite low in development. Note that this will not
  // meaningfully improve granularity of Google Drive tracking, since we're
  // constrained by what we get from the API, but works for chat and voice.
  5 * 1000 :
  5 * 60 * 1000; // milliseconds
