Package.describe({
  summary: 'Enables instant communication between client and server',
  version: '1.0.0',
});

Package.onUse(function(api) {
  api.export('Ansible');
  api.use('ecmascript');
  api.use('ecmascript-collections');
  api.addFiles(['lib.js']);
  api.addFiles(['server.js'], 'server');
});

Npm.depends({
  logfmt: '1.2.0',
});
