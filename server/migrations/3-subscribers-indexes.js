Migrations.add({
  version: 3,
  name: 'Add indexes for subscriber tracking',
  up() {
    Models.Subscribers._ensureIndex({ server: 1 });
    Models.Subscribers._ensureIndex({ name: 1 });
  },
});
