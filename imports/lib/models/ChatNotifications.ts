import ChatNotificationSchema, { ChatNotificationType } from '../schemas/ChatNotification';
import Base from './Base';

const ChatNotifications = new Base<ChatNotificationType>('chatnotifications');
ChatNotifications.attachSchema(ChatNotificationSchema);
// No publish here -- we do a custom publish for notifications matching the target user.

export default ChatNotifications;
