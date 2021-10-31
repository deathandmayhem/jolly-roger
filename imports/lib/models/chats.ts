import { huntsMatchingCurrentUser } from '../../model-helpers';
import ChatMessageSchema, { ChatMessageType } from '../schemas/chat';
import Base from './base';

const ChatMessages = new Base<ChatMessageType>('chatmessages');
ChatMessages.attachSchema(ChatMessageSchema);
ChatMessages.publish(huntsMatchingCurrentUser);

export default ChatMessages;
