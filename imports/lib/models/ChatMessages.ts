import { z } from "zod";
import type { ModelType } from "./Model";
import SoftDeletedModel from "./SoftDeletedModel";
import { allowedEmptyString, foreignKey } from "./customTypes";
import withCommon from "./withCommon";

const MentionBlock = z.object({
  type: z.literal("mention"),
  userId: foreignKey,
});
export type ChatMessageMentionNodeType = z.infer<typeof MentionBlock>;

const PuzzleBlock = z.object({
  type: z.literal("puzzle"),
  puzzleId: foreignKey,
});
export type ChatMessagePuzzleNodeType = z.infer<typeof PuzzleBlock>;

const TextBlock = z.object({
  text: allowedEmptyString,
});
export type ChatMessageTextNodeType = z.infer<typeof TextBlock>;

const ContentNode = z.union([MentionBlock, TextBlock, PuzzleBlock]);
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
    pinTs: z.date().nullable().optional(),
    parentId: foreignKey.nullable().optional(),
    // Not really a foreign key, since this is always another message when present
  }),
);
const ChatMessages = new SoftDeletedModel("jr_chatmessages", ChatMessage);
ChatMessages.addIndex({ deleted: 1, puzzle: 1 });
ChatMessages.addIndex({ hunt: 1, createdAt: 1 });
export type ChatMessageType = ModelType<typeof ChatMessages>;

export default ChatMessages;
