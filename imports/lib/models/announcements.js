import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { huntsMatchingCurrentUser } from '/imports/model-helpers.js';

// A broadcast message from a hunt operator to be displayed
// to all participants in the specified hunt.
Schemas.Announcements = new SimpleSchema([
  Schemas.Base,
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
Models.Announcements = new Models.Base('announcements');
Models.Announcements.attachSchema(Schemas.Announcements);
Models.Announcements.publish(huntsMatchingCurrentUser);
