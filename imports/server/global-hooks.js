import { Meteor } from 'meteor/meteor';
import { Hooks, SlackHooks } from './hooks.js';
/* global globalHooks: true */

Meteor.startup(() => {
  // code to run on server at startup
  globalHooks = new Hooks();
  globalHooks.addHookSet(SlackHooks);
});
