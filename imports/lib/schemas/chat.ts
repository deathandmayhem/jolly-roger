import * as t from 'io-ts';
import { date } from 'io-ts-types';
import SimpleSchema from 'simpl-schema';
import { BaseCodec, BaseOverrides } from './base';
import { Overrides, buildSchema, inheritSchema } from './typedSchemas';

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

const [ChatMessageCodec, ChatMessageOverrides] = inheritSchema(
  BaseCodec, ChatMessageFields,
  BaseOverrides, ChatMessageFieldsOverrides,
);
export { ChatMessageCodec };
export type ChatMessageType = t.TypeOf<typeof ChatMessageCodec>;

// A single chat message
const ChatMessage = buildSchema(ChatMessageCodec, ChatMessageOverrides);

export default ChatMessage;
