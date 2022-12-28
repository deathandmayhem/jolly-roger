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
    const chatMessage = (await ChatMessages.findOneAsync(chatMessageId))!;

    if (!chatMessage.sender) {
      // Don't notify for system messages.
      return;
    }

    // Find all users who are in this hunt with dingwords set.
    const huntMembers = await MeteorUsers.find({
      hunts: chatMessage.hunt,
      'dingwords.0': { $exists: true },
    }, {
      fields: { _id: 1, dingwords: 1 },
    }).fetchAsync();

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
        dingwords.every((dingword) => {
          if (normalizedText.includes(dingword)) {
            // It matched!  We should notify the user of this message.

            // console.log(`u ${p._id} dingword ${dingword} matched message ${chatMessage.text}`);
            await ChatNotifications.insertAsync({
              user: u._id,
              sender: chatMessage.sender,
              puzzle: chatMessage.puzzle,
              hunt: chatMessage.hunt,
              text: chatMessage.text,
              timestamp: chatMessage.timestamp,
            });

            // Once we match, we don't need to check any other dingwords.
            return false;
          }

          return true;
        });
      }
    });

    // const end = Date.now();
    // const elapsed = end - start;
    // console.log(`Dingword hooks ran in ${elapsed} msec`);
  },
};

export default DingwordHooks;
