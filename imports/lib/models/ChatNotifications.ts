import { z } from 'zod';
import { ChatMessageContent } from './ChatMessages';
import type { ModelType } from './Model';
import SoftDeletedModel from './SoftDeletedModel';
import { foreignKey, nonEmptyString } from './customTypes';
import withCommon from './withCommon';

// A notification triggered by a chat message sent by a user.
const ChatNotification = withCommon(z.object({
  // The userId of the user for whom this notification targets.
  user: foreignKey,

  // The sender of the chat message that tripped the user's dingwords.
  // System messages are forbidden from triggering dingword notifications.
  sender: foreignKey,

  // The puzzle to which this chat was sent.
  puzzle: foreignKey,
  // The hunt in which the puzzle resides.
  hunt: foreignKey,
  // The message body, if chat message v1. Plain text.
  text: nonEmptyString.optional(),
  // The message content, if chat message v2.
  content: ChatMessageContent.optional(),
  // The date this message was sent.  Used for ordering chats in the log.
  timestamp: z.date(),
}));

const ChatNotifications = new SoftDeletedModel('jr_chatnotifications', ChatNotification);
export type ChatNotificationType = ModelType<typeof ChatNotifications>;

export default ChatNotifications;
