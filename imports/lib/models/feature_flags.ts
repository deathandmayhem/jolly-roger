import FeatureFlagsSchema, { FeatureFlagType } from '../schemas/feature_flags';
import Base from './base';

const FeatureFlags = new Base<FeatureFlagType>('featureflags');
FeatureFlags.attachSchema(FeatureFlagsSchema);

// All feature flags are accessible
FeatureFlags.publish();

export default FeatureFlags;
