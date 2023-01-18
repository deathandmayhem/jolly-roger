import type { ChatMessageContentNodeType, ChatMessageMentionNodeType } from './schemas/ChatMessage';

export default function nodeIsMention(
  node: ChatMessageContentNodeType
): node is ChatMessageMentionNodeType {
  return 'type' in node && node.type === 'mention';
}
