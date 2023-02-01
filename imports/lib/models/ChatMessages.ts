import ChatMessage from '../schemas/ChatMessage';
import type { ModelType } from './Model';
import SoftDeletedModel from './SoftDeletedModel';

const ChatMessages = new SoftDeletedModel('jr_chatmessages', ChatMessage);
export type ChatMessageType = ModelType<typeof ChatMessages>;

export default ChatMessages;
