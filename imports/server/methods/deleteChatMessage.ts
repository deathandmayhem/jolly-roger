import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import ChatMessages from "../../lib/models/ChatMessages";
import ChatNotifications from "../../lib/models/ChatNotifications";
import deleteChatMessage from "../../methods/deleteChatMessage";
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

    const message = await ChatMessages.findOneAsync(chatMessageId);
    if (!message) {
      throw new Meteor.Error(404, "Chat message not found");
    }

    if (message.sender !== this.userId) {
      throw new Meteor.Error(403, "You can only delete your own messages");
    }

    await ChatMessages.destroyAsync(chatMessageId);
    await ChatNotifications.destroyAsync({
      puzzle: message.puzzle,
      sender: message.sender,
      timestamp: message.timestamp,
    });
  },
});
