Package.describe({
  summary: 'ShareJS communication over the Meteor DDP connection',
  version: '0.0.1',
});

Npm.depends({
  share: '0.7.40',
  livedb: '0.5.13',
  'livedb-mongo': '0.4.1',
});

Package.onUse(function(api) {
  api.use('ecmascript');
  api.use('ecmascript-collections');
  api.use('underscore');
  api.use(['cosmos:browserify', 'mongo-id'], 'client');

  api.addFiles(['server.js'], 'server');
  api.addFiles(['client.js', 'sharejs.browserify.js'], 'client');

  api.export(['ShareJS', 'ShareJSSocket'], 'client');
});
