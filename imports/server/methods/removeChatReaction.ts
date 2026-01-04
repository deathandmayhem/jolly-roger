import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import ChatMessages from "../../lib/models/ChatMessages";
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
    for (const msg of messages) {
      await ChatMessages.removeAsync(msg);
    }
  },
});
