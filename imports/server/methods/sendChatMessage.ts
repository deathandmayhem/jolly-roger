import { check, Match } from 'meteor/check';
import ChatMessages from '../../lib/models/ChatMessages';
import sendChatMessageInternal from '../sendChatMessageInternal';
import defineMethod from './defineMethod';

defineMethod(ChatMessages.methods.send, {
  validate(arg) {
    check(arg, {
      puzzleId: String,
      content: String,
    });

    return arg;
  },

  async run({ puzzleId, content }: { puzzleId: string, content: string }) {
    check(this.userId, String);
    const contentObj = JSON.parse(content);
    check(contentObj, {
      type: 'message' as const,
      children: [Match.OneOf({
        type: 'mention' as const,
        userId: String,
      }, {
        text: String,
      })],
    });

    await sendChatMessageInternal({
      puzzleId,
      content: contentObj,
      sender: this.userId,
    });
  },
});
