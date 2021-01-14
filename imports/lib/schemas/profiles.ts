import * as t from 'io-ts';
import { BaseCodec, BaseOverrides } from './base';
import DiscordAccountType from './discord_account';
import { Overrides, buildSchema, inheritSchema } from './typedSchemas';

const ProfileFieldsType = t.type({
  // Autopopulated with the first of the user's email addresses?
  primaryEmail: t.string,
  googleAccount: t.union([t.string, t.undefined]),
  discordAccount: t.union([DiscordAccountType, t.undefined]),
  // Initial value: ""
  displayName: t.string,
  phoneNumber: t.union([t.string, t.undefined]),
  muteApplause: t.union([t.boolean, t.undefined]),
  dingwords: t.union([t.array(t.string), t.undefined]),
});

const ProfileFieldsOverrides: Overrides<t.TypeOf<typeof ProfileFieldsType>> = {
};

const [ProfileCodec, ProfileOverrides] = inheritSchema(
  BaseCodec, ProfileFieldsType,
  BaseOverrides, ProfileFieldsOverrides,
);
export { ProfileCodec };
export type ProfileType = t.TypeOf<typeof ProfileCodec>;

// A profile for a user.
// Note that we're using a separate schema from users.$.profile, because there are weird
// non-overridable allow/deny rules that mean we can't trust them to have any useful schema.
const Profiles = buildSchema(ProfileCodec, ProfileOverrides);

export default Profiles;
