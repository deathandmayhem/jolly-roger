import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import Base from './base.js';

const Hunts = new SimpleSchema([
  Base,
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

export default Hunts;
