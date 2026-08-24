import { Meteor } from "meteor/meteor";
import ChatMessageRevisions from "../lib/models/ChatMessageRevisions";
import type { ChatMessageContentType } from "../lib/models/ChatMessages";
import ChatMessages from "../lib/models/ChatMessages";

export default async function mutateChatMessageInternal({
  chatMessageId,
  userId,
  content,
}: {
  chatMessageId: string;
  userId: string;
  content?: ChatMessageContentType;
}) {
  const message = await ChatMessages.findOneAsync(chatMessageId);
  if (!message) {
    throw new Meteor.Error(404, "Chat message not found");
  }

  if (message.sender !== userId) {
    throw new Meteor.Error(403, "You can only edit your own messages");
  }

  if (!message.content) {
    throw new Meteor.Error(400, "Cannot edit a deleted message");
  }

  await ChatMessageRevisions.insertAsync({
    chatMessage: message._id,
    hunt: message.hunt,
    content: message.content,
  });

  if (content) {
    await ChatMessages.updateAsync(chatMessageId, {
      $set: {
        content,
        edited: true,
      },
    });
  } else {
    await ChatMessages.updateAsync(chatMessageId, {
      $unset: {
        content: 1,
      },
    });
  }

  // Note: We intentionally do not run message creation hooks on edit.
  // As a result:
  // 1. Edits will not be reflected in the Discord firehose channel (re-running
  //    DiscordHooks would post a duplicate message to Discord).
  // 2. Dingword searches and @-mention notifications will not re-run (which
  //    avoids generating duplicate notifications for existing mentions/dingwords).
}
