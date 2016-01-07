Package.describe({
  name: 'blanche',
});

Package.onUse(function(api) {
  api.use(['ecmascript', 'ecmascript-collections', 'underscore', 'ansible']);
  api.addFiles(['list.js'], 'server');
  api.export(['Blanche'], 'server');
});
