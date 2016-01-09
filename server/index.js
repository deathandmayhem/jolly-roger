Meteor.startup(() => {
  // code to run on server at startup
  globalHooks = new Hooks();
  globalHooks.addHookSet(SlackHooks);
  globalHooks.addHookSet(DocumentHooks);
});
