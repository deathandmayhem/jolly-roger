import FeatureFlags from '../../lib/models/FeatureFlags';
import featureFlagsAll from '../../lib/publications/featureFlagsAll';
import definePublication from './definePublication';

definePublication(featureFlagsAll, {
  run() {
    return FeatureFlags.find();
  },
});
