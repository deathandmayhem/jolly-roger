import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import ChatMessages, { ChatMessageType } from "../../lib/models/ChatMessages";
import removeChatMessage from "../../methods/removeChatMessage";
import defineMethod from "./defineMethod";

defineMethod(removeChatMessage, {
  validate(arg) {
    check(arg, {
      parentId: String,
      reaction: String,
      sender: String,
    });

    return arg;
  },

  async run({
    parentId,
    reaction,
    sender,
  }: {
    parentId: string;
    reaction: string;
    sender: string;
  }) {
    check(this.userId, String);
    if (this.userId !== sender) {
      throw new Meteor.Error(403, "Not allowed");
    }
    const messages = ChatMessages.find({ parentId, sender });
    if (!messages) {
      throw new Meteor.Error(404, "Message not found");
    }
    for (const msg: ChatMessageType of messages) {
      if (
        msg.content &&
        msg.content.children &&
        msg?.content?.children?.length === 1 &&
        msg?.content?.children[0]?.text === reaction
      ) {
        await ChatMessages.removeAsync(msg);
      }
    }
  },
});
