import { Mongo } from "meteor/mongo";
import { z } from "zod";

export interface CallActivity {
  _id: string; // Required for Meteor collections
  user: string; // The user ID associated with the activity
  // Add other fields as needed if you later expand functionality
  // For example:
  hunt: string;
  ts: Date;
  call: string; // Puzzle ID if related to a puzzle
}

export const CallActivities = new Mongo.Collection<CallActivity>(
  "callActivities",
);

export default CallActivities;
