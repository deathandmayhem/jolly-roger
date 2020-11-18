import { Migrations } from 'meteor/percolate:migrations';
import FeatureFlags from '../../lib/models/feature_flags';

Migrations.add({
  version: 26,
  name: 'Remove subscription counter/watchers circuit breaker',
  up() {
    FeatureFlags.remove({ name: 'disable.subcounters' });
    FeatureFlags.remove({ name: 'disable.subfetches' });
  },
});
