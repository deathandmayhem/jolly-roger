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
  roles: {
    type: [String],
    optional: true,
  },
  hunts: {
    type: [String],
    defaultValue: [],
    regEx: SimpleSchema.RegEx.Id,
  },

  profile: {
    type: Object,
  },
  'profile.operating': {
    type: Boolean,
    defaultValue: false,
  },
});
Meteor.users.attachSchema(Schemas.User);

if (Meteor.isServer) {
  Meteor.publish('huntMembership', function() {
    if (!this.userId) {
      return [];
    }

    return Meteor.users.find(this.userId, {fields: {hunts: 1}});
  });

  Meteor.publish('userRoles', function(targetUserId) {
    check(targetUserId, String);

    // Only publish other users' roles to other operators.
    if (!Roles.userHasRole(this.userId, 'admin')) {
      return [];
    }

    return Meteor.users.find(targetUserId, {fields: {roles: 1}});
  });
}
