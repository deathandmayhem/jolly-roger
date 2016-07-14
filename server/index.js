import { Meteor } from 'meteor/meteor';
import { Hooks, SlackHooks, DocumentHooks } from '/imports/server/hooks.js';
/* global globalHooks: true */

Meteor.startup(() => {
  // code to run on server at startup
  globalHooks = new Hooks();
  globalHooks.addHookSet(SlackHooks);
  globalHooks.addHookSet(DocumentHooks);
});
