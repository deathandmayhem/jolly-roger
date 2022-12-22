import * as t from 'io-ts';
import { BaseCodec, BaseOverrides } from './Base';
import { buildSchema, inheritSchema } from './typedSchemas';

const FeatureFlagFields = t.type({
  name: t.string,
  // type represents the mode of a feature flag. If a feature flag
  // with a given name doesn't exist, it's assumed to be of type
  // "off"
  type: t.union([t.literal('off'), t.literal('on')]),
});

const [FeatureFlagCodec, FeatureFlagOverrides] = inheritSchema(
  BaseCodec,
  FeatureFlagFields,
  BaseOverrides,
  {},
);
export { FeatureFlagCodec };
export type FeatureFlagType = t.TypeOf<typeof FeatureFlagCodec>

const FeatureFlag = buildSchema(FeatureFlagCodec, FeatureFlagOverrides);

export default FeatureFlag;
