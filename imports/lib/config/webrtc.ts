import { Meteor } from "meteor/meteor";

export const RECENT_ACTIVITY_TIME_WINDOW_MS = Meteor.isDevelopment
  ? // Make the timeout much faster in development for easier testing
    5 * 1000
  : 60 * 1000;
