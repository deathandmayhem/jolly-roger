import * as t from 'io-ts';
import { BaseCodec, BaseOverrides } from './base';
import { inheritSchema, buildSchema } from './typedSchemas';

// We can't represent tagged unions in SimpleSchema, so we use different types
// for the actual type vs. the type used to derive the schema.
export const PublicSettingCodec = t.intersection([
  BaseCodec,
  t.taggedUnion('name', [
    t.type({
      name: t.literal('webrtc.turnserver'),
      value: t.type({
        urls: t.array(t.string),
      }),
    }),
    // TODO: not actually implemented/used yet, but I needed a second possible
    // value for io-ts to not choke on this being preemptively labeled a tagged
    // union
    t.type({
      name: t.literal('branding'),
      value: t.type({
        // TODO: add fields for rebranding
        // servername: t.string, // "Jolly Roger"
      }),
    }),
  ]),
]);
export type PublicSettingType = t.TypeOf<typeof PublicSettingCodec>;

const PublicSettingFields = t.type({
  name: t.string,
  value: t.object,
});

const [PublicSettingSchemaCodec, PublicSettingOverrides] = inheritSchema(
  BaseCodec, PublicSettingFields,
  BaseOverrides, {},
);

const PublicSetting = buildSchema(PublicSettingSchemaCodec, PublicSettingOverrides);

export default PublicSetting;
