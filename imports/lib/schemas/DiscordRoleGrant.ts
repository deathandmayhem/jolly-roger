import * as t from 'io-ts';
import { BaseCodec, BaseOverrides } from './Base';
import { Id } from './regexes';
import { buildSchema, inheritSchema, Overrides } from './typedSchemas';

const DiscordRoleGrantFields = t.type({
  guild: t.string,
  role: t.string,
  user: t.string,
  discordAccountId: t.string,
});

const DiscordRoleGrantFieldsOverrides: Overrides<t.TypeOf<typeof DiscordRoleGrantFields>> = {
  guild: {
    regEx: /[0-9]+/,
  },
  role: {
    regEx: /[0-9]+/,
  },
  user: {
    regEx: Id,
  },
  discordAccountId: {
    regEx: /[0-9]+/,
  },
};

const [DiscordRoleGrantCodec, DiscordRoleGrantOverrides] = inheritSchema(
  BaseCodec,
  DiscordRoleGrantFields,
  BaseOverrides,
  DiscordRoleGrantFieldsOverrides,
);

export { DiscordRoleGrantCodec };
export type DiscordRoleGrantType = t.TypeOf<typeof DiscordRoleGrantCodec>;

const DiscordRoleGrant = buildSchema(DiscordRoleGrantCodec, DiscordRoleGrantOverrides);

export default DiscordRoleGrant;
