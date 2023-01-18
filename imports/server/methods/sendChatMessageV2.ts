import { check, Match } from 'meteor/check';
import sendChatMessageV2 from '../../methods/sendChatMessageV2';
import sendChatMessageInternalV2 from '../sendChatMessageInternalV2';
import defineMethod from './defineMethod';

defineMethod(sendChatMessageV2, {
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

    await sendChatMessageInternalV2({
      puzzleId,
      content: contentObj,
      sender: this.userId,
    });
  },
});
