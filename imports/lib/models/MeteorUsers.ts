import { Meteor } from 'meteor/meteor';

// Block the default rule allowing modification of the user's profile.
Meteor.users.deny({ update: () => true });

// Re-export Meteor.users. We should require this instead of using Meteor.users
// directly to ensure that the schema has always been attached.
export default Meteor.users;
