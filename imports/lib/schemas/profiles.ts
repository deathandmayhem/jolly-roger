import * as t from 'io-ts';
import { Overrides, buildSchema, inheritSchema } from './typedSchemas';
import { BaseType, BaseOverrides } from './base';

const ProfileFieldsType = t.type({
  // Autopopulated with the first of the user's email addresses?
  primaryEmail: t.string,
  googleAccount: t.union([t.string, t.undefined]),
  // Initial value: ""
  displayName: t.string,
  phoneNumber: t.union([t.string, t.undefined]),
  // Do we want to enforce that you can only have one Slack handle?  Uniqueness
  // here might be beneficial for integration where you want to look up chat
  // participation. Also, possibly this should be stored as Slack ID instead,
  // and we look up your ID from your claimed handle on save with a Slack API
  // call?
  //
  // As a note, this is only optional because we might not know it when the
  // profile is created. If someone doesn't have a Slack handle set, they get an
  // annoying, un-dismissable notice asking them to sign up for Slack.
  slackHandle: t.union([t.string, t.undefined]),
  muteApplause: t.union([t.boolean, t.undefined]),
});

const ProfileFieldsOverrides: Overrides<t.TypeOf<typeof ProfileFieldsType>> = {
  slackHandle: {
    // Format of handles is documented at
    // https://get.slack.help/hc/en-us/articles/216360827-Change-your-username
    regEx: /^[-A-Za-z0-9._]{0,21}$/,
  },
};

const [ProfileType, ProfileOverrides] = inheritSchema(
  BaseType, ProfileFieldsType,
  BaseOverrides, ProfileFieldsOverrides,
);
export { ProfileType };

// A profile for a user.
// Note that we're using a separate schema from users.$.profile, because there are weird
// non-overridable allow/deny rules that mean we can't trust them to have any useful schema.
const Profiles = buildSchema(ProfileType, ProfileOverrides);

export default Profiles;
