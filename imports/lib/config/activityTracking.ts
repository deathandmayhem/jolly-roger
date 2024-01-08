import { Meteor } from "meteor/meteor";

export const ACTIVITY_GRANULARITY = Meteor.isDevelopment
  ? // Set granularity to be quite low in development. Note that this will not
    // meaningfully improve granularity of Google Drive tracking, since we're
    // constrained by what we get from the API, but works for chat and voice.
    5 * 1000
  : 5 * 60 * 1000; // milliseconds

// Either 3 minutes in development or 3 hours in production
export const ACTIVITY_SEGMENTS = 36;

export type PublishedBucket = {
  _id: string;
  hunt: string;
  puzzle: string;
  ts: Date;

  totalUsers: number;
  chatUsers: number;
  callUsers: number;
  documentUsers: number;
};

export const ACTIVITY_COLLECTION = "puzzle_activities";
