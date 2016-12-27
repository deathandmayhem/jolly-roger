import { SimpleSchema } from 'meteor/aldeed:simple-schema';
// A profile for a user.
// Note that we're using a separate schema from users.$.profile, because there are weird
// non-overridable allow/deny rules that mean we can't trust them to have any useful schema.
Schemas.Profiles = new SimpleSchema([
  Schemas.Base,
  {
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
      optional: true,
    },
  },
]);
Models.Profiles = new Models.Base('profiles');
Models.Profiles.attachSchema(Schemas.Profiles);

// Ideally, we'd only publish profiles whose hunt set overlaps with
// yours, but that's hard so for now publish everything
Models.Profiles.publish();
