import { huntsMatchingCurrentUser } from '../../model-helpers';
import { ChatMessageType } from '../schemas/ChatMessage';
import Base from './Base';

const ChatMessages = new Base<ChatMessageType>('chatmessages');
ChatMessages.publish(huntsMatchingCurrentUser);

export default ChatMessages;
