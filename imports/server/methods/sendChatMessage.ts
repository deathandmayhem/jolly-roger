import { check, Match } from "meteor/check";
import sendChatMessage from "../../methods/sendChatMessage";
import sendChatMessageInternal from "../sendChatMessageInternal";
import defineMethod from "./defineMethod";

defineMethod(sendChatMessage, {
  validate(arg) {
    check(arg, {
      puzzleId: String,
      content: String,
    });

    return arg;
  },

  async run({ puzzleId, content }: { puzzleId: string; content: string }) {
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
            text: String,
          },
        ),
      ],
    });

    let isPinned = false;

    if (('children' in contentObj) &&
    (contentObj.children.length > 0) &&
    ('text' in contentObj.children[0]) &&
    (contentObj.children[0].text.match(/^\s*\/pin\s+/i))) {
      isPinned = true;
      contentObj.children[0].text = contentObj.children[0].text.replace(/^\s*\/pin\s+/, '');
    }


    await sendChatMessageInternal({
      puzzleId,
      content: contentObj,
      sender: this.userId,
      pinned: isPinned,
    });
  },
});
