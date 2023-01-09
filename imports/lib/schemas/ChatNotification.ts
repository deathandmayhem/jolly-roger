import * as t from 'io-ts';
import { date } from 'io-ts-types';
import { BaseCodec, BaseOverrides } from './Base';
import { Id } from './regexes';
import { Overrides, buildSchema, inheritSchema } from './typedSchemas';

// A notification triggered by a chat message sent by a user.
const ChatNotificationFields = t.type({
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
  // The message content, if chat message v2.  Actually contains ChatMessageContentType
  content: t.union([t.UnknownRecord, t.undefined]),
  // The date this message was sent.  Used for ordering chats in the log.
  timestamp: date,
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

const [ChatNotificationCodec, ChatNotificationOverrides] = inheritSchema(
  BaseCodec,
  ChatNotificationFields,
  BaseOverrides,
  ChatNotificationFieldsOverrides,
);
export { ChatNotificationCodec };
export type ChatNotificationType = t.TypeOf<typeof ChatNotificationCodec>;

// A single chat message
const ChatNotification = buildSchema(ChatNotificationCodec, ChatNotificationOverrides);

export default ChatNotification;
