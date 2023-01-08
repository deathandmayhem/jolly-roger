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
  return (node as any).text !== undefined;
}

export function nodeIsMention(
  node: ChatMessageContentNodeType
): node is ChatMessageMentionNodeType {
  return (node as any).type === 'mention';
}

const Content = t.type({
  type: t.literal('message'),
  children: t.array(t.union([MentionBlock, TextBlock])),
});
export type ChatMessageContentType = t.TypeOf<typeof Content>;

const ChatMessageFields = t.type({
  hunt: t.string,
  // The puzzle to which this chat was sent.
  puzzle: t.string,
  // The message body. Plain text.
  text: t.union([t.string, t.undefined]),

  // The message contents, as an opaque object which has the
  // schema of Content above
  content: t.union([t.UnknownRecord, t.undefined]),

  // If absent, this message is considered a "system" message
  sender: t.union([t.string, t.undefined]),
  // The date this message was sent.  Used for ordering chats in the log.
  timestamp: date,
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

const [ChatMessageCodec, ChatMessageOverrides] = inheritSchema(
  BaseCodec,
  ChatMessageFields,
  BaseOverrides,
  ChatMessageFieldsOverrides,
);
export { ChatMessageCodec };
export type ChatMessageType = t.TypeOf<typeof ChatMessageCodec>;

// A single chat message
const ChatMessage = buildSchema(ChatMessageCodec, ChatMessageOverrides);

export default ChatMessage;
