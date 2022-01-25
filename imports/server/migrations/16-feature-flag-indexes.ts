import { Migrations } from 'meteor/percolate:migrations';
import FeatureFlags from '../../lib/models/FeatureFlags';

Migrations.add({
  version: 16,
  name: 'Create index for feature flags',
  up() {
    FeatureFlags._ensureIndex({ name: 1 }, { unique: true });
  },
});
