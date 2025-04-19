import { check, Match } from "meteor/check";
import ChatMessages from "../../lib/models/ChatMessages";
import sendChatMessage from "../../methods/sendChatMessage";
import sendChatMessageInternal from "../sendChatMessageInternal";
import defineMethod from "./defineMethod";

defineMethod(sendChatMessage, {
  validate(arg) {
    check(arg, {
      puzzleId: String,
      content: String,
      parentId: Match.Optional(String),
    });

    return arg;
  },

  async run({
    puzzleId,
    content,
    parentId,
  }: {
    puzzleId: string;
    content: string;
    parentId?: string | null;
  }) {
    check(this.userId, String);
    let contentObj = JSON.parse(content);
    check(contentObj, {
      type: "message" as const,
      children: [
        Match.OneOf(
          {
            type: "mention" as const,
            userId: String,
          },
          {
            type: "puzzle" as const,
            puzzleId: String,
          },
          {
            text: String,
          },
        ),
      ],
    });

    let isPinned = false;

    if (
      "children" in contentObj &&
      contentObj.children.length > 0 &&
      "text" in contentObj.children[0]
    ) {
      if (contentObj.children[0].text.match(/^\s*\/(un)?pin\s*$/i)) {
        const puzzle = puzzleId;
        await ChatMessages.updateAsync(
          {
            puzzle,
            pinTs: { $ne: null },
          },
          {
            $set: {
              pinTs: null,
            },
          },
        );
        return;
      } else if (contentObj.children[0].text.match(/^\s*\/pin\s+\S+/i)) {
        isPinned = true;
        contentObj.children[0].text = contentObj.children[0].text.replace(
          /^\s*\/pin\s+/i,
          "",
        );
      }
    }

    await sendChatMessageInternal({
      puzzleId,
      content: contentObj,
      sender: this.userId,
      pinTs: isPinned ? new Date() : null,
      parentId: parentId ?? null,
    });
  },
});
