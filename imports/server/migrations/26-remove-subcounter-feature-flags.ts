import FeatureFlags from '../../lib/models/FeatureFlags';
import Migrations from './Migrations';

Migrations.add({
  version: 26,
  name: 'Remove subscription counter/watchers circuit breaker',
  up() {
    FeatureFlags.remove({ name: 'disable.subcounters' });
    FeatureFlags.remove({ name: 'disable.subfetches' });
  },
});
