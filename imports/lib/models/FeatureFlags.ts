import FeatureFlag from '../schemas/FeatureFlag';
import type { ModelType } from './Model';
import SoftDeletedModel from './SoftDeletedModel';

const FeatureFlags = new SoftDeletedModel('jr_featureflags', FeatureFlag);

export type FeatureFlagType = ModelType<typeof FeatureFlags>;

export default FeatureFlags;
