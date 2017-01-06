import { SimpleSchema } from 'meteor/aldeed:simple-schema';

Schemas.FeatureFlags = new SimpleSchema([
  Schemas.Base,
  {
    name: {
      type: String,
    },

    // type represents the mode of a feature flag. If a feature flag
    // with a given name doesn't exist, it's assumed to be of type
    // "off"
    type: {
      type: String,
      allowedValues: ['off', 'on', 'random_by'],
    },

    // random is the fraction of values that are on if type is
    // random_by
    random: {
      type: Number,
      optional: true,
    },
  },
]);

Models.FeatureFlags = new Models.Base('featureflags');
Models.FeatureFlags.attachSchema(Schemas.FeatureFlags);

// All feature flags are accessible
Models.FeatureFlags.publish();
