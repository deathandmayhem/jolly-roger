import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import Base from './base.js';

// A broadcast message from a hunt operator to be displayed
// to all participants in the specified hunt.
const Announcements = new SimpleSchema([
  Base,
  {
    hunt: {
      // The hunt this announcement comes from.
      type: String,
      regEx: SimpleSchema.RegEx.Id,
    },
    message: {
      // The message to be broadcast.
      type: String,
    },
  },
]);

export default Announcements;
