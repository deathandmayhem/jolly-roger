import FeatureFlags from '../../lib/models/FeatureFlags';
import Migrations from './Migrations';

Migrations.add({
  version: 25,
  name: 'Remove Slack feature flag',
  up() {
    FeatureFlags.remove({ name: 'disable.slack' });
  },
});
