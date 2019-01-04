import SimpleSchema from 'simpl-schema';
import Base from './base.js';

// A single chat message
const ChatMessages = new SimpleSchema({
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
});
ChatMessages.extend(Base);

export default ChatMessages;
