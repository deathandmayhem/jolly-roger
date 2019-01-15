import FeatureFlagsSchema from '../schemas/feature_flags';
import Base from './base';

const FeatureFlags = new Base('featureflags');
FeatureFlags.attachSchema(FeatureFlagsSchema);

// All feature flags are accessible
FeatureFlags.publish();

export default FeatureFlags;
