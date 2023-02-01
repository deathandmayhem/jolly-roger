import { Meteor } from 'meteor/meteor';
import { Promise as MeteorPromise } from 'meteor/promise';
import { AllModels } from '../lib/models/Model';
import User from '../lib/schemas/User';
import attachSchema from './attachSchema';

Meteor.startup(() => {
  // We want this to be synchronous, so that if it fails we crash the
  // application (better than having no schema in place). We should be able to
  // eliminate this if Meteor backports support for async startup functions (as
  // requested in https://github.com/meteor/meteor/discussions/12468)
  MeteorPromise.await((async () => {
    for (const model of AllModels.values()) {
      await attachSchema(model.schema, model.collection);
    }
    // Note: this will fail type checking if our schema for User gets out of sync
    // with the type declaration for Meteor.User. (This could happen if we change
    // our extensions to Meteor.User in imports/lib/schemas/User.ts but is more
    // likely to happen if Meteor upstream changes their type declaration.)
    await attachSchema(User, Meteor.users);
  })());
});
