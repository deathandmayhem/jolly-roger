import { Meteor } from 'meteor/meteor';

// Block the default rule allowing modification of the user's profile.
Meteor.users.deny({ update: () => true });

export function indexedDisplayNames(): Map<string, string> {
  const res = new Map<string, string>();
  Meteor.users.find({
    displayName: { $ne: undefined },
  }, {
    fields: { displayName: 1 },
  }).forEach((u) => res.set(u._id, u.displayName!));
  return res;
}

// Re-export Meteor.users. We should require this instead of using Meteor.users
// directly to ensure that the schema has always been attached.
export default Meteor.users;
