Migrations.add({
  version: 4,
  name: 'Fix indexes for subscriber tracking',
  up() {
    Models.Subscribers._dropIndex({name: 1});
    Models.Subscribers._ensureIndex({'context.hunt': 1});
  },
});
