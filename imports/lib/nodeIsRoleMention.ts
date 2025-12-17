import type {
  ChatMessageContentNodeType,
  ChatMessageRoleMentionNodeType,
} from "./models/ChatMessages";

export default function nodeIsRoleMention(
  node: ChatMessageContentNodeType,
): node is ChatMessageRoleMentionNodeType {
  return "type" in node && node.type === "role-mention";
}
