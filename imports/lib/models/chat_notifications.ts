import ChatNotificationSchema, { ChatNotificationType } from '../schemas/chat_notification';
import Base from './base';

const ChatNotifications = new Base<ChatNotificationType>('chatnotifications');
ChatNotifications.attachSchema(ChatNotificationSchema);
// No publish here -- we do a custom publish for notifications matching the target user.

export default ChatNotifications;
