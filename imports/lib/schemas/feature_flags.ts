import * as t from 'io-ts';
import { buildSchema, inheritSchema } from './typedSchemas';
import { BaseType, BaseOverrides } from './base';

const FeatureFlagFields = t.type({
  name: t.string,
  // type represents the mode of a feature flag. If a feature flag
  // with a given name doesn't exist, it's assumed to be of type
  // "off"
  type: t.union([t.literal('off'), t.literal('on'), t.literal('random_by')]),
  random: t.union([t.number, t.undefined]),
});

const [FeatureFlagType, FeatureFlagOverrides] = inheritSchema(
  BaseType, FeatureFlagFields,
  BaseOverrides, {},
);
export { FeatureFlagType };

const FeatureFlags = buildSchema(FeatureFlagType, FeatureFlagOverrides);

export default FeatureFlags;
