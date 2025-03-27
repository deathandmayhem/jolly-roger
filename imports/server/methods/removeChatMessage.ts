import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import ChatMessages from "../../lib/models/ChatMessages";
import removeChatMessage from "../../methods/removeChatMessage";
import defineMethod from "./defineMethod";

defineMethod(removeChatMessage, {
  validate(arg) {
    check(arg, {
      id: String,
    });

    return arg;
  },

  async run({ id }: { id: string }) {
    check(this.userId, String);
    const message = await ChatMessages.findOneAsync({ _id: id });
    if (!message) {
      throw new Meteor.Error(404, "Message not found");
    }
    if (this.userId !== message?.sender) {
      throw new Meteor.Error(403, "Not allowed");
    }

    await ChatMessages.removeAsync(message);
  },
});
