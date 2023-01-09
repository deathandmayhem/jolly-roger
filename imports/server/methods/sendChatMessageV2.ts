import { check, Match } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import { ChatMessageContentType } from '../../lib/schemas/ChatMessage';
import sendChatMessageV2 from '../../methods/sendChatMessageV2';
import sendChatMessageInternalV2 from '../sendChatMessageInternalV2';

sendChatMessageV2.define({
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
      type: String,
      children: [Match.OneOf({
        type: String,
        userId: String,
      }, {
        text: String,
      })],
    });
    if (contentObj.type !== 'message') {
      throw new Meteor.Error(400, 'Content must have type "message"');
    }
    contentObj.children.forEach((child) => {
      const type = (child as any).type;
      if (type !== undefined && type !== 'mention') {
        throw new Meteor.Error(400, 'Non-text content child must have type "mention"');
      }
    });

    await sendChatMessageInternalV2({
      puzzleId,
      content: contentObj as ChatMessageContentType,
      sender: this.userId,
    });
  },
});
