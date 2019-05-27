import { huntsMatchingCurrentUser } from '../../model-helpers';
import ChatMessagesSchema, { ChatMessageType } from '../schemas/chats';
import Base from './base';

const ChatMessages = new Base<ChatMessageType>('chatmessages');
ChatMessages.attachSchema(ChatMessagesSchema);
ChatMessages.publish(huntsMatchingCurrentUser);

export default ChatMessages;
