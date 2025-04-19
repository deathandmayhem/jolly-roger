import type { ChatMessageContentNodeType } from "./models/ChatMessages";

export default function chatMessageNodeType(
  node: ChatMessageContentNodeType,
): "text" | "mention" | "puzzle" {
  return "type" in node ? node.type : "text";
}
