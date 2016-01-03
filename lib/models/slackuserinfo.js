// Stores a Slack API token associated with a user and other context from Slack about that user.
Schemas.SlackUserInfo = new SimpleSchema({
  _id: {
    // _id should match that of the Meteor.user this document is related to.
    type: String,
    regEx: SimpleSchema.RegEx.Id,
  },
  token: {
    // Slack API token.  Secret, so we must avoid publishing it in the collection.
    type: String,
  },
  slackUserId: {
    // The Slack userId (e.g. "U03CQBG33") that this token acts as.
    type: String,
  },
  handle: {
    // The Slack handle associated with the above Slack userId.
    // Useful for displaying profile information.
    type: String,
  },
  displayName: {
    // The Slack display name associated with the above Slack userId.
    // Useful for displaying profile information.
    type: String,
  },
});

// We can't just publish everything since that would give away everyone's Slack tokens to everyone.
//Models.SlackUserInfo = new Models.Base('slackuserinfo');
//Models.SlackUserInfo.attachSchema(Schemas.SlackUserInfo);
