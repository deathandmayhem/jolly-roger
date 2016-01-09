Package.describe({
  name: 'server-deps',
});

Npm.depends({
  googleapis: '2.1.7',
});

Package.onUse(function(api) {
  api.addFiles(['deps.js'], 'server');
  api.export(['googleapis'], 'server');
});
