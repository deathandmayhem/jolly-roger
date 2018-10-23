import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import Base from './base.js';

// Broadcast announcements that have not yet been viewed by a given
// user
const PendingAnnouncements = new SimpleSchema([
  Base,
  {
    hunt: {
      type: String,
      regEx: SimpleSchema.RegEx.Id,
    },
    announcement: {
      type: String,
      regEx: SimpleSchema.RegEx.Id,
    },
    user: {
      type: String,
      regEx: SimpleSchema.RegEx.Id,
    },
  },
]);

export default PendingAnnouncements;
