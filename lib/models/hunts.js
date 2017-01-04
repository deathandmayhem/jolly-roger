import { Meteor } from 'meteor/meteor';
import { _ } from 'meteor/underscore';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

Schemas.Hunts = new SimpleSchema([
  Schemas.Base,
  {
    name: {
      type: String,
    },

    // Everyone that joins the hunt will be added to these mailing
    // lists
    mailingLists: {
      type: [String],
      defaultValue: [],
    },

    // This message is displayed (as markdown) to users that are not
    // members of this hunt. It should include instructions on how to
    // join
    signupMessage: {
      type: String,
      optional: true,
    },

    // If this is true, then any member of this hunt is allowed to add
    // others to it. Otherwise, you must be an operator to add someone
    // to the hunt.
    openSignups: {
      type: Boolean,
      defaultValue: false,
    },

    // If this is provided, then any message sent in chat for a puzzle
    // associated with this hunt will also be mirrored to a Slack channel
    // with the specified name.
    // Example value: "#firehose"
    firehoseSlackChannel: {
      type: String,
      optional: true,
    },

    // If provided, then on puzzle creation and puzzle solve, we will
    // send a message to the specified slack channel about it.
    puzzleHooksSlackChannel: {
      type: String,
      optional: true,
    },
  },
]);

Models.Hunts = new Models.Base('hunts');
Models.Hunts.attachSchema(Schemas.Hunts);

// All hunts are accessible, since they only contain metadata
Models.Hunts.publish();

// operators are always allowed to join someone to a hunt; non-admins
// can if they are a member and if the hunt allows open signups.
Roles.registerAction('hunt.join', true);
Roles.loggedInRole.allow('hunt.join', (huntId) => {
  if (!_.include(Meteor.user().hunts, huntId)) {
    return false;
  }

  const hunt = Models.Hunts.findOne(huntId);
  if (!hunt) {
    return false;
  }

  return hunt.openSignups;
});
