import FeatureFlagsSchema from '../schemas/feature_flags.js';
import Base from './base.js';

const FeatureFlags = new Base('featureflags');
FeatureFlags.attachSchema(FeatureFlagsSchema);

// All feature flags are accessible
FeatureFlags.publish();

export default FeatureFlags;
