import type { FeatureFlagType } from '../schemas/FeatureFlag';
import Base from './Base';

const FeatureFlags = new Base<FeatureFlagType>('featureflags');

export default FeatureFlags;
