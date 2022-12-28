import FeatureFlags from '../../lib/models/FeatureFlags';
import Migrations from './Migrations';

Migrations.add({
  version: 25,
  name: 'Remove Slack feature flag',
  async up() {
    await FeatureFlags.removeAsync({ name: 'disable.slack' });
  },
});
