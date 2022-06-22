import { Meteor } from 'meteor/meteor';
import UserSchema from '../schemas/User';

// Block the default rule allowing modification of the user's profile.
Meteor.users.deny({ update: () => true });
Meteor.users.attachSchema(UserSchema);

export function indexedDisplayNames(): Record<string, string> {
  return Object.fromEntries(Meteor.users.find({
    displayName: { $ne: undefined },
  }, {
    fields: { displayName: 1 },
  })
    .map((u) => [u._id, u.displayName!]));
}

// Re-export Meteor.users. We should require this instead of using Meteor.users
// directly to ensure that the schema has always been attached.
export default Meteor.users;
