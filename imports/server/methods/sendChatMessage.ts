import { check } from "meteor/check";
import { checkChatMessageContent } from "../../lib/models/ChatMessages";
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
    const contentObj = JSON.parse(content);
    checkChatMessageContent(contentObj);

    await sendChatMessageInternal({
      puzzleId,
      content: contentObj,
      sender: this.userId,
    });
  },
});
