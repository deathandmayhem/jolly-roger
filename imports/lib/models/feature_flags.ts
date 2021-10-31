import FeatureFlagSchema, { FeatureFlagType } from '../schemas/feature_flag';
import Base from './base';

const FeatureFlags = new Base<FeatureFlagType>('featureflags');
FeatureFlags.attachSchema(FeatureFlagSchema);

// All feature flags are accessible
FeatureFlags.publish();

export default FeatureFlags;
