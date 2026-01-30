import { z } from "zod";
import { allowedEmptyString, foreignKey } from "../typedModel/customTypes";
import type { ModelType } from "../typedModel/Model";
import { URL } from "../typedModel/regexes";
import SoftDeletedModel from "../typedModel/SoftDeletedModel";
import withCommon from "../typedModel/withCommon";

const UserMentionBlock = z.object({
  type: z.literal("mention"),
  userId: foreignKey,
});
export type ChatMessageMentionNodeType = z.infer<typeof UserMentionBlock>;

const RoleMentionBlock = z.object({
  type: z.literal("role-mention"),
  roleId: z.literal("operator"), // expand this into a union if we add more roles
});
export type ChatMessageRoleMentionNodeType = z.infer<typeof RoleMentionBlock>;

const ImageBlock = z.object({
  type: z.literal("image"),
  url: z.string().regex(URL),
});
export type ChatMessageImageNodeType = z.infer<typeof ImageBlock>;

const TextBlock = z.object({
  text: allowedEmptyString,
});
export type ChatMessageTextNodeType = z.infer<typeof TextBlock>;

const ContentNode = z.union([
  UserMentionBlock,
  RoleMentionBlock,
  ImageBlock,
  TextBlock,
]);
export type ChatMessageContentNodeType = z.infer<typeof ContentNode>;

export const ChatMessageContent = z.object({
  type: z.literal("message"),
  children: ContentNode.array(),
});
export type ChatMessageContentType = z.infer<typeof ChatMessageContent>;

export function contentFromMessage(msg: string): ChatMessageContentType {
  return {
    type: "message" as const,
    children: [{ text: msg }],
  };
}

const ChatMessage = withCommon(
  z.object({
    hunt: foreignKey,
    // The puzzle to which this chat was sent.
    puzzle: foreignKey,
    // The message contents.
    content: ChatMessageContent,
    // If absent, this message is considered a "system" message
    sender: foreignKey.optional(),
    // The date this message was sent.  Used for ordering chats in the log.
    timestamp: z.date(),
  }),
);
const ChatMessages = new SoftDeletedModel("jr_chatmessages", ChatMessage);
ChatMessages.addIndex({ deleted: 1, puzzle: 1 });
ChatMessages.addIndex({ hunt: 1, createdAt: 1 });
export type ChatMessageType = ModelType<typeof ChatMessages>;

export default ChatMessages;
