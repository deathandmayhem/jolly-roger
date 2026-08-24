import { check } from "meteor/check";
import { checkChatMessageContent } from "../../lib/models/ChatMessages";
import editChatMessage from "../../methods/editChatMessage";
import mutateChatMessageInternal from "../mutateChatMessageInternal";
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

    const contentObj = JSON.parse(content);
    checkChatMessageContent(contentObj);

    await mutateChatMessageInternal({
      chatMessageId,
      userId: this.userId,
      content: contentObj,
    });
  },
});
