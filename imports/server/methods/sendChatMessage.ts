import { check } from 'meteor/check';
import sendChatMessage from '../../methods/sendChatMessage';
import sendChatMessageInternal from '../sendChatMessageInternal';

sendChatMessage.define({
  validate(arg) {
    check(arg, {
      puzzleId: String,
      message: String,
    });

    return arg;
  },

  run({ puzzleId, message }) {
    check(this.userId, String);

    sendChatMessageInternal({ puzzleId, message, sender: this.userId });
  },
});
