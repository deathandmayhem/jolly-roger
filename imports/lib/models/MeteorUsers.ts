import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import UserSchema from '../schemas/User';

// Block the default rule allowing modification of the user's profile.
Meteor.users.deny({ update: () => true });
// I don't totally understand ambient types. As far as I can tell, the provided
// ambient types for Meteor.users don't load our extensions to Mongo.Collection.
// By explicitly loading the module, our version of the type picks up the
// extension, and by casting we switch from the non-extended type to the
// extended one. This seemed a little better than just casting to any.
(<Mongo.Collection<Meteor.User>>Meteor.users).attachSchema(UserSchema);

export function indexedDisplayNames(): Record<string, string> {
  return Object.fromEntries(Meteor.users.find({
    'profile.displayName': { $ne: null },
  }, {
    fields: { 'profile.displayName': 1 },
  })
    .map((u) => [u._id, u.profile!.displayName]));
}

// Re-export Meteor.users. We should require this instead of using Meteor.users
// directly to ensure that the schema has always been attached.
export default Meteor.users;
