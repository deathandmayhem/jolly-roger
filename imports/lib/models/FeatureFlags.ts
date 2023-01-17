import { Meteor } from 'meteor/meteor';
import type { FeatureFlagType } from '../schemas/FeatureFlag';
import Base from './Base';

const FeatureFlags = new Base<FeatureFlagType>('featureflags');

// All feature flags are always available on the client
if (Meteor.isServer) {
  Meteor.publish(null, () => FeatureFlags.find());
}

export default FeatureFlags;
