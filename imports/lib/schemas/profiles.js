import SimpleSchema from 'simpl-schema';
import Base from './base.js';

// A profile for a user.
// Note that we're using a separate schema from users.$.profile, because there are weird
// non-overridable allow/deny rules that mean we can't trust them to have any useful schema.
const Profiles = new SimpleSchema({
  _id: {
    // To pass in a specific id, it must be declared in the schema.
    type: String,
    regEx: SimpleSchema.RegEx.Id,
  },
  primaryEmail: {
    // Autopopulated with the first of the user's email addresses?
    type: String,
  },
  googleAccount: {
    type: String,
    optional: true,
  },
  displayName: {
    // Initial value: "".
    type: String,
  },
  phoneNumber: {
    type: String,
    optional: true,
  },
  slackHandle: {
    // Do we want to enforce that you can only have one Slack handle?  Uniqueness here might be
    // beneficial for integration where you want to look up chat participation.
    // Also, possibly this should be stored as Slack ID instead, and we look up your ID from your
    // claimed handle on save with a Slack API call?
    type: String,
    // Format of handles is documented at
    // https://get.slack.help/hc/en-us/articles/216360827-Change-your-username
    regEx: /^[-A-Za-z0-9._]{0,21}$/,
  },
  muteApplause: {
    type: Boolean,
    optional: true, // lazily initialized
  },
});
Profiles.extend(Base);

export default Profiles;
