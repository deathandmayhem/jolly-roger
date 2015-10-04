// Does not inherit from Schemas.Base
Schemas.User = new SimpleSchema({
  username: {
    type: String,
    optional: true,
    regEx: /^[a-z0-9A-Z_]{3,15}$/,
  },
  emails: {
    type: [Object],
  },
  'emails.$.address': {
    type: String,
    regEx: SimpleSchema.RegEx.Email,
  },
  'emails.$.verified': {
    type: Boolean,
  },
  createdAt: {
    type: Date,
  },
  services: {
    type: Object,
    optional: true,
    blackbox: true,
  },
});
Meteor.users.attachSchema(Schemas.User);
