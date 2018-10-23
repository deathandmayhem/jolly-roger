import { huntsMatchingCurrentUser } from '../../model-helpers.js';
import ChatMessagesSchema from '../schemas/chats.js';
import Base from './base.js';

const ChatMessages = new Base('chatmessages');
ChatMessages.attachSchema(ChatMessagesSchema);
ChatMessages.publish(huntsMatchingCurrentUser);

export default ChatMessages;
