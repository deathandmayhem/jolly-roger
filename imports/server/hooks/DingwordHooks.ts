import Flags from '../../Flags';
import ChatMessages from '../../lib/models/ChatMessages';
import ChatNotifications from '../../lib/models/ChatNotifications';
import MeteorUsers from '../../lib/models/MeteorUsers';
import Hookset from './Hookset';

const DingwordHooks: Hookset = {
  onChatMessageCreated(chatMessageId: string) {
    // Respect feature flag.
    if (Flags.active('disable.dingwords')) {
      return;
    }

    // const start = Date.now();
    const chatMessage = ChatMessages.findOne(chatMessageId)!;

    if (!chatMessage.sender) {
      // Don't notify for system messages.
      return;
    }

    // Find all users who are in this hunt with dingwords set.
    const huntMembers = MeteorUsers.find({
      hunts: chatMessage.hunt,
      'dingwords.0': { $exists: true },
    }, {
      fields: { _id: 1, dingwords: 1 },
    }).fetch();

    // For each user with dingwords, check if this message (normalized to
    // lower-case) triggers any of their dingwords.
    const normalizedText = chatMessage.text.trim().toLowerCase();
    huntMembers.forEach((u) => {
      // Avoid making users ding themselves.
      if (u._id === chatMessage.sender) {
        return;
      }

      const dingwords = u.dingwords;
      if (dingwords) {
        for (let i = 0; i < dingwords.length; i++) {
          const dingword = dingwords[i];
          if (normalizedText.indexOf(dingword) !== -1) {
            // It matched!  We should notify the user of this message.

            // console.log(`u ${p._id} dingword ${dingword} matched message ${chatMessage.text}`);
            ChatNotifications.insert({
              user: u._id,
              sender: chatMessage.sender,
              puzzle: chatMessage.puzzle,
              hunt: chatMessage.hunt,
              text: chatMessage.text,
              timestamp: chatMessage.timestamp,
            });

            // Once we match, we don't need to check any other dingwords.
            break;
          }
        }
      }
    });

    // const end = Date.now();
    // const elapsed = end - start;
    // console.log(`Dingword hooks ran in ${elapsed} msec`);
  },
};

export default DingwordHooks;
