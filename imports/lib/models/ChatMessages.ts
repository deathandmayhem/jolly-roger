import { huntsMatchingCurrentUser } from '../../model-helpers';
import ChatMessageSchema, { ChatMessageType } from '../schemas/ChatMessage';
import Base from './Base';

const ChatMessages = new Base<ChatMessageType>('chatmessages');
ChatMessages.attachSchema(ChatMessageSchema);
ChatMessages.publish(huntsMatchingCurrentUser);

export default ChatMessages;
