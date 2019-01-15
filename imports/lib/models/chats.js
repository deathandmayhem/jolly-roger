import { huntsMatchingCurrentUser } from '../../model-helpers';
import ChatMessagesSchema from '../schemas/chats';
import Base from './base';

const ChatMessages = new Base('chatmessages');
ChatMessages.attachSchema(ChatMessagesSchema);
ChatMessages.publish(huntsMatchingCurrentUser);

export default ChatMessages;
