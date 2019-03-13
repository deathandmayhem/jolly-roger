import * as t from 'io-ts';
import { date } from 'io-ts-types/lib/Date/date';
import SimpleSchema from 'simpl-schema';
import { Overrides, buildSchema, inheritSchema } from './typedSchemas';
import { BaseType, BaseOverrides } from './base';

const ChatMessageFields = t.type({
  hunt: t.string,
  // The puzzle to which this chat was sent.
  puzzle: t.string,
  // The message body. Plain text.
  text: t.string,
  // If absent, this message is considered a "system" message
  sender: t.union([t.string, t.undefined]),
  // The date this message was sent.  Used for ordering chats in the log.
  timestamp: date,
});

const ChatMessageFieldsOverrides: Overrides<t.TypeOf<typeof ChatMessageFields>> = {
  hunt: {
    regEx: SimpleSchema.RegEx.Id,
  },
  puzzle: {
    regEx: SimpleSchema.RegEx.Id,
  },
  sender: {
    regEx: SimpleSchema.RegEx.Id,
  },
};

const [ChatMessageType, ChatMessageOverrides] = inheritSchema(
  BaseType, ChatMessageFields,
  BaseOverrides, ChatMessageFieldsOverrides,
);
export { ChatMessageType };

// A single chat message
const ChatMessages = buildSchema(ChatMessageType, ChatMessageOverrides);

export default ChatMessages;
