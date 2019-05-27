import * as t from 'io-ts';
import { buildSchema, inheritSchema } from './typedSchemas';
import { BaseCodec, BaseOverrides } from './base';

const FeatureFlagFields = t.type({
  name: t.string,
  // type represents the mode of a feature flag. If a feature flag
  // with a given name doesn't exist, it's assumed to be of type
  // "off"
  type: t.union([t.literal('off'), t.literal('on'), t.literal('random_by')]),
  random: t.union([t.number, t.undefined]),
});

const [FeatureFlagCodec, FeatureFlagOverrides] = inheritSchema(
  BaseCodec, FeatureFlagFields,
  BaseOverrides, {},
);
export { FeatureFlagCodec };
export type FeatureFlagType = t.TypeOf<typeof FeatureFlagCodec>

const FeatureFlags = buildSchema(FeatureFlagCodec, FeatureFlagOverrides);

export default FeatureFlags;
