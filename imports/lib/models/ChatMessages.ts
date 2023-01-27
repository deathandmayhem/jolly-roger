import type { ChatMessageType } from '../schemas/ChatMessage';
import Base from './Base';

const ChatMessages = new Base<ChatMessageType>('chatmessages');

export default ChatMessages;
