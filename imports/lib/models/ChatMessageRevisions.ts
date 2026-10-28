import { z } from "zod";
import { foreignKey } from "../typedModel/customTypes";
import Model, { type ModelType } from "../typedModel/Model";
import withCommon from "../typedModel/withCommon";
import { ChatMessageContent } from "./ChatMessages";

const ChatMessageRevision = withCommon(
  z.object({
    // The chat message this revision belongs to
    chatMessage: foreignKey,
    hunt: foreignKey,
    // The message contents at this revision.
    content: ChatMessageContent,
  }),
);

const ChatMessageRevisions = new Model(
  "jr_chatmessagerevisions",
  ChatMessageRevision,
);
ChatMessageRevisions.addIndex({ chatMessage: 1, createdAt: 1 });
ChatMessageRevisions.addIndex({ hunt: 1, createdAt: 1 });

export type ChatMessageRevisionType = ModelType<typeof ChatMessageRevisions>;

export default ChatMessageRevisions;
