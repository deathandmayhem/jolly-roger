import { Meteor } from "meteor/meteor";
import { AllModels } from "../lib/models/Model";
import { User } from "../lib/models/User";
import attachSchema from "./attachSchema";
import runIfLatestBuild from "./runIfLatestBuild";

runIfLatestBuild(async () => {
  for (const model of AllModels.values()) {
    await attachSchema(model.schema, model.collection);
  }
  // Note: this will fail type checking if our schema for User gets out of sync
  // with the type declaration for Meteor.User. (This could happen if we change
  // our extensions to Meteor.User in imports/lib/models/User.ts but is more
  // likely to happen if Meteor upstream changes their type declaration.)
  await attachSchema(User, Meteor.users);
});
