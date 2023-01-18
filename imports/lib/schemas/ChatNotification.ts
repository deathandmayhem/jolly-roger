import * as t from 'io-ts';
import { date } from 'io-ts-types';
import { BaseCodec, BaseOverrides } from './Base';
import { ChatMessageContent } from './ChatMessage';
import { Id } from './regexes';
import type { Overrides } from './typedSchemas';
import { buildSchema, inheritSchema } from './typedSchemas';

const SharedFields = {
  // The userId of the user for whom this notification targets.
  user: t.string,

  // The sender of the chat message that tripped the user's dingwords.
  // System messages are forbidden from triggering dingword notifications.
  sender: t.string,

  // The puzzle to which this chat was sent.
  puzzle: t.string,
  // The hunt in which the puzzle resides.
  hunt: t.string,
  // The message body, if chat message v1. Plain text.
  text: t.union([t.string, t.undefined]),
  // The date this message was sent.  Used for ordering chats in the log.
  timestamp: date,
};

// A notification triggered by a chat message sent by a user.
const ChatNotificationCodec = t.intersection([
  BaseCodec,
  t.type({
    ...SharedFields,
    // The message content, if chat message v2.
    content: t.union([ChatMessageContent, t.undefined]),
  }),
]);
export { ChatNotificationCodec };
export type ChatNotificationType = t.TypeOf<typeof ChatNotificationCodec>;

// A notification triggered by a chat message sent by a user, as we represent it to
// simpl-schema, since it can't handle tagged unions well
const ChatNotificationFields = t.type({
  ...SharedFields,
  // The message content, if chat message v2.  Actually contains ChatMessageContentType
  content: t.union([t.UnknownRecord, t.undefined]),
});

const ChatNotificationFieldsOverrides: Overrides<t.TypeOf<typeof ChatNotificationFields>> = {
  hunt: {
    regEx: Id,
  },
  puzzle: {
    regEx: Id,
  },
  user: {
    regEx: Id,
  },
  sender: {
    regEx: Id,
  },
};

const [ChatNotificationSchemaCodec, ChatNotificationOverrides] = inheritSchema(
  BaseCodec,
  ChatNotificationFields,
  BaseOverrides,
  ChatNotificationFieldsOverrides,
);

// A single chat message
const ChatNotification = buildSchema(ChatNotificationSchemaCodec, ChatNotificationOverrides);

export default ChatNotification;
