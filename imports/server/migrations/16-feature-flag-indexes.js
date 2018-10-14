import { Migrations } from 'meteor/percolate:migrations';

Migrations.add({
  version: 16,
  name: 'Create index for feature flags',
  up() {
    Models.FeatureFlags._ensureIndex({ name: 1 }, { unique: true });
  },
});
