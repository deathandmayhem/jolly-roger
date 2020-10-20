import * as t from 'io-ts';
import { BaseCodec, BaseOverrides } from './base';
import { inheritSchema, buildSchema } from './typedSchemas';

// We can't represent tagged unions in SimpleSchema, so we use different types
// for the actual type vs. the type used to derive the schema.
const GuildType = t.type({
  _id: t.string,
  name: t.string,
});
export const SettingCodec = t.intersection([
  BaseCodec,
  t.taggedUnion('name', [
    t.type({
      name: t.literal('gdrive.credential'),
      value: t.type({
        refreshToken: t.string,
        email: t.string,
      }),
    }),
    t.type({
      name: t.literal('gdrive.template.document'),
      value: t.type({ id: t.string }),
    }),
    t.type({
      name: t.literal('gdrive.template.spreadsheet'),
      value: t.type({ id: t.string }),
    }),
    t.type({
      name: t.literal('discord.bot'),
      value: t.type({
        token: t.string,
      }),
    }),
    t.type({
      name: t.literal('discord.guild'),
      value: t.type({
        guild: GuildType,
      }),
    }),
  ]),
]);
export type SettingType = t.TypeOf<typeof SettingCodec>;

const SettingFields = t.type({
  name: t.string,
  value: t.object,
});

const [SettingSchemaCodec, SettingOverrides] = inheritSchema(
  BaseCodec, SettingFields,
  BaseOverrides, {},
);

const Settings = buildSchema(SettingSchemaCodec, SettingOverrides);

export default Settings;
