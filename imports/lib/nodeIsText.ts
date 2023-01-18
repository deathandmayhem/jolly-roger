import type { ChatMessageContentNodeType, ChatMessageTextNodeType } from './schemas/ChatMessage';

export default function nodeIsText(
  node: ChatMessageContentNodeType
): node is ChatMessageTextNodeType {
  return 'text' in node;
}
