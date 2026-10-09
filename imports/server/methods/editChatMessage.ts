import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import type { ChatMessageContentType } from "../../lib/models/ChatMessages";
import ChatMessages from "../../lib/models/ChatMessages";
import editChatMessage from "../../methods/editChatMessage";
import defineMethod from "./defineMethod";

defineMethod(editChatMessage, {
  validate(arg) {
    check(arg, {
      chatMessageId: String,
      content: String,
    });
    return arg;
  },

  async run({ chatMessageId, content }) {
    check(this.userId, String);

    const message = await ChatMessages.findOneAsync(chatMessageId);
    if (!message) {
      throw new Meteor.Error(404, "Chat message not found");
    }

    if (message.sender !== this.userId) {
      throw new Meteor.Error(403, "You can only edit your own messages");
    }

    const contentObj = JSON.parse(content) as ChatMessageContentType;
    check(contentObj, {
      type: "message" as const,
      children: [
        Match.OneOf(
          {
            type: "mention" as const,
            userId: String,
          },
          {
            type: "role-mention" as const,
            roleId: "operator" as const,
          },
          {
            type: "image" as const,
            url: String,
          },
          {
            text: String,
          },
        ),
      ],
    });

    await ChatMessages.updateAsync(chatMessageId, {
      $set: {
        content: contentObj,
      },
    });

    // Note: We intentionally do not run message creation hooks on edit.
    // As a result:
    // 1. Edits will not be reflected in the Discord firehose channel (re-running
    //    DiscordHooks would post a duplicate message to Discord).
    // 2. Dingword searches and @-mention notifications will not re-run (which
    //    avoids generating duplicate notifications for existing mentions/dingwords).
  },
});
