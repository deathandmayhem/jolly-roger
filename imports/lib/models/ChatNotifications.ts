import { ChatNotificationType } from '../schemas/ChatNotification';
import Base from './Base';

const ChatNotifications = new Base<ChatNotificationType>('chatnotifications');
// No publish here -- we do a custom publish for notifications matching the target user.

export default ChatNotifications;
