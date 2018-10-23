import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import Base from './base.js';

const FeatureFlags = new SimpleSchema([
  Base,
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

export default FeatureFlags;
