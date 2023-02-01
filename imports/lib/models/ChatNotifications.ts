import ChatNotification from '../schemas/ChatNotification';
import type { ModelType } from './Model';
import SoftDeletedModel from './SoftDeletedModel';

const ChatNotifications = new SoftDeletedModel('jr_chatnotifications', ChatNotification);
export type ChatNotificationType = ModelType<typeof ChatNotifications>;

export default ChatNotifications;
