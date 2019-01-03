import SimpleSchema from 'simpl-schema';
import Base from './base.js';

// Broadcast announcements that have not yet been viewed by a given
// user
const PendingAnnouncements = new SimpleSchema({
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
});
PendingAnnouncements.extend(Base);

export default PendingAnnouncements;
