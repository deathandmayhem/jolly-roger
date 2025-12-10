import type {
  ChatMessageContentNodeType,
  ChatMessageImageNodeType,
} from "./models/ChatMessages";

export default function nodeIsImage(
  node: ChatMessageContentNodeType,
): node is ChatMessageImageNodeType {
  return "type" in node && node.type === "image";
}
