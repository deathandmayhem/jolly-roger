import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import ChatMessages from "../../lib/models/ChatMessages";
import setChatMessagePin from "../../methods/setChatMessagePin";
import defineMethod from "./defineMethod";

defineMethod(setChatMessagePin, {
  validate(arg) {
    check(arg, {
      messageId: String,
      puzzleId: String,
      huntId: String,
      newPinState: Boolean,
    });

    return arg;
  },

  async run({
    messageId,
    puzzleId,
    huntId,
    newPinState,
  }: {
    messageId: string;
    puzzleId: string;
    huntId: string;
    newPinState: boolean;
  }) {
    check(this.userId, String);

    const user = await Meteor.users.findOneAsync(this.userId);

    if (!user?.hunts?.includes(huntId)) {
      return;
    }

    const message = await ChatMessages.findOneAsync({
      _id: messageId,
      puzzle: puzzleId,
      hunt: huntId,
    });

    if (!message) {
      return;
    }

    message.pinTs = newPinState ? new Date() : null;

    await ChatMessages.updateAsync(
      { _id: messageId, puzzle: puzzleId, hunt: huntId },
      { $set: { pinTs: newPinState ? new Date() : null } },
    );
  },
});
