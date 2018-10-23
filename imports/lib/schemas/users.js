import { SimpleSchema } from 'meteor/aldeed:simple-schema';

// Does not inherit from Base
const User = new SimpleSchema({
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
  lastLogin: {
    type: Date,
    optional: true,
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

export default User;
