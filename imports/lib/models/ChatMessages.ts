import { z } from 'zod';
import TypedMethod from '../../methods/TypedMethod';
import TypedPublication from '../publications/TypedPublication';
import type { ModelType } from './Model';
import SoftDeletedModel from './SoftDeletedModel';
import { allowedEmptyString, foreignKey } from './customTypes';
import withCommon from './withCommon';

const MentionBlock = z.object({
  type: z.literal('mention'),
  userId: foreignKey,
});
export type ChatMessageMentionNodeType = z.infer<typeof MentionBlock>;

const TextBlock = z.object({
  text: allowedEmptyString,
});
export type ChatMessageTextNodeType = z.infer<typeof TextBlock>;

const ContentNode = z.union([MentionBlock, TextBlock]);
export type ChatMessageContentNodeType = z.infer<typeof ContentNode>;

export const ChatMessageContent = z.object({
  type: z.literal('message'),
  children: ContentNode.array(),
});
export type ChatMessageContentType = z.infer<typeof ChatMessageContent>;

export function contentFromMessage(msg: string): ChatMessageContentType {
  return {
    type: 'message' as const,
    children: [
      { text: msg },
    ],
  };
}

const ChatMessage = withCommon(z.object({
  hunt: foreignKey,
  // The puzzle to which this chat was sent.
  puzzle: foreignKey,
  // The message contents.
  content: ChatMessageContent,
  // If absent, this message is considered a "system" message
  sender: foreignKey.optional(),
  // The date this message was sent.  Used for ordering chats in the log.
  timestamp: z.date(),
}));
const ChatMessages = new SoftDeletedModel('jr_chatmessages', ChatMessage, {
  send: new TypedMethod<{ puzzleId: string, content: string }, void>(
    'ChatMessages.methods.send'
  ),
}, {
  forPuzzle: new TypedPublication<{ puzzleId: string, huntId: string }>(
    'ChatMessages.publications.forPuzzle'
  ),
  forFirehose: new TypedPublication<{ huntId: string }>(
    'ChatMessages.publications.forFirehose'
  ),
});
ChatMessages.addIndex({ deleted: 1, puzzle: 1 });
ChatMessages.addIndex({ hunt: 1, createdAt: 1 });
export type ChatMessageType = ModelType<typeof ChatMessages>;

export default ChatMessages;
