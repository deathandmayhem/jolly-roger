import type { ChatMessageContentNodeType, ChatMessageMentionNodeType } from './models/ChatMessages';

export default function nodeIsMention(
  node: ChatMessageContentNodeType
): node is ChatMessageMentionNodeType {
  return 'type' in node && node.type === 'mention';
}
