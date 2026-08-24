import { check } from "meteor/check";
import deleteChatMessage from "../../methods/deleteChatMessage";
import mutateChatMessageInternal from "../mutateChatMessageInternal";
import defineMethod from "./defineMethod";

defineMethod(deleteChatMessage, {
  validate(arg) {
    check(arg, {
      chatMessageId: String,
    });
    return arg;
  },

  async run({ chatMessageId }) {
    check(this.userId, String);

    await mutateChatMessageInternal({
      chatMessageId,
      userId: this.userId,
    });
  },
});
