import ChatNotificationsSchema, { ChatNotificationType } from '../schemas/chat_notifications';
import Base from './base';

const ChatNotifications = new Base<ChatNotificationType>('chatnotifications');
ChatNotifications.attachSchema(ChatNotificationsSchema);
// No publish here -- we do a custom publish for notifications matching the target user.

export default ChatNotifications;
