import * as t from 'io-ts';
import { date } from 'io-ts-types';
import { BaseCodec, BaseOverrides } from './Base';
import { Id } from './regexes';
import { Overrides, buildSchema, inheritSchema } from './typedSchemas';

const MentionBlock = t.type({
  type: t.literal('mention'),
  userId: t.string,
});
export type ChatMessageMentionNodeType = t.TypeOf<typeof MentionBlock>;

const TextBlock = t.type({
  text: t.string,
});
export type ChatMessageTextNodeType = t.TypeOf<typeof TextBlock>;

const ContentNode = t.union([MentionBlock, TextBlock]);
export type ChatMessageContentNodeType = t.TypeOf<typeof ContentNode>;

export function nodeIsText(node: ChatMessageContentNodeType): node is ChatMessageTextNodeType {
  return 'text' in node;
}

export function nodeIsMention(
  node: ChatMessageContentNodeType
): node is ChatMessageMentionNodeType {
  return 'type' in node && node.type === 'mention';
}

export const ChatMessageContent = t.type({
  type: t.literal('message'),
  children: t.array(t.union([MentionBlock, TextBlock])),
});
export type ChatMessageContentType = t.TypeOf<typeof ChatMessageContent>;

const SharedFields = {
  hunt: t.string,
  // The puzzle to which this chat was sent.
  puzzle: t.string,
  // The message body. Plain text.
  text: t.union([t.string, t.undefined]),
  // If absent, this message is considered a "system" message
  sender: t.union([t.string, t.undefined]),
  // The date this message was sent.  Used for ordering chats in the log.
  timestamp: date,
};

const ChatMessageCodec = t.intersection([
  BaseCodec,
  t.type({
    ...SharedFields,
    // The message contents
    content: t.union([ChatMessageContent, t.undefined]),
  }),
]);
export { ChatMessageCodec };
export type ChatMessageType = t.TypeOf<typeof ChatMessageCodec>;

const ChatMessageFields = t.type({
  ...SharedFields,
  // The message contents, as an opaque object which has the
  // schema of Content above
  content: t.union([t.UnknownRecord, t.undefined]),
});

const ChatMessageFieldsOverrides: Overrides<t.TypeOf<typeof ChatMessageFields>> = {
  hunt: {
    regEx: Id,
  },
  puzzle: {
    regEx: Id,
  },
  sender: {
    regEx: Id,
  },
};

const [ChatMessageSchemaCodec, ChatMessageOverrides] = inheritSchema(
  BaseCodec,
  ChatMessageFields,
  BaseOverrides,
  ChatMessageFieldsOverrides,
);

// A single chat message
const ChatMessage = buildSchema(ChatMessageSchemaCodec, ChatMessageOverrides);

export default ChatMessage;
