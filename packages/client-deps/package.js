Package.describe({
  name: 'client-deps',
});

Npm.depends({
  externalify: '0.1.0',
  history: '1.13.1',
  'react-router': '1.0.0',
  'react-bootstrap': '0.28.1',
  'react-router-bootstrap': '0.19.3',
});

Package.onUse(function(api) {
  api.use(['cosmos:browserify', 'react-runtime'], 'client');
  api.addFiles(['app.browserify.js', 'app.browserify.options.json'], 'client');
  api.export(['ReactBootstrap', 'ReactRouter', 'ReactRouterBootstrap'], 'client');
});
