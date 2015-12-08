Package.describe({
  name: 'jr-components',
});

Package.onUse(function(api) {
  api.use(['react', 'client-deps'], 'client');
  api.addFiles([
    'lib/00index.jsx',
    'lib/blaze_template.jsx',
    'lib/modal_form.jsx',
  ], 'client');
  api.export(['JRC'], 'client');
});
