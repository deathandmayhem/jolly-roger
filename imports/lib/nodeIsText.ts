import type {
  ChatMessageContentNodeType,
  ChatMessageTextNodeType,
} from "./models/ChatMessages";

export default function nodeIsText(
  node: ChatMessageContentNodeType,
): node is ChatMessageTextNodeType {
  return "text" in node;
}
