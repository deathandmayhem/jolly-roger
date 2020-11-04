import { Migrations } from 'meteor/percolate:migrations';
import FeatureFlags from '../../lib/models/feature_flags';

Migrations.add({
  version: 25,
  name: 'Remove Slack feature flag',
  up() {
    FeatureFlags.remove({ name: 'disable.slack' });
  },
});
