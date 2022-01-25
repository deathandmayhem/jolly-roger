import FeatureFlagSchema, { FeatureFlagType } from '../schemas/FeatureFlag';
import Base from './Base';

const FeatureFlags = new Base<FeatureFlagType>('featureflags');
FeatureFlags.attachSchema(FeatureFlagSchema);

// All feature flags are accessible
FeatureFlags.publish();

export default FeatureFlags;
