import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { huntsMatchingCurrentUser } from '../../model-helpers.js';

// A single chat message
Schemas.ChatMessages = new SimpleSchema([
  Schemas.Base,
  {
    hunt: {
      type: String,
      regEx: SimpleSchema.RegEx.Id,
    },
    puzzle: {
      // The puzzle to which this chat was sent.
      type: String,
      regEx: SimpleSchema.RegEx.Id,
    },
    text: {
      // The message body. Plain text.
      type: String,
    },
    sender: {
      type: String,
      regEx: SimpleSchema.RegEx.Id,
      optional: true, // If absent, this message is considered a "system" message
    },
    timestamp: {
      // The date this message was sent.  Used for ordering chats in the log.
      type: Date,
    },
  },
]);

Models.ChatMessages = new Models.Base('chatmessages');
Models.ChatMessages.attachSchema(Schemas.ChatMessages);
Models.ChatMessages.publish(huntsMatchingCurrentUser);
