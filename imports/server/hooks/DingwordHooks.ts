import Flags from '../../Flags';
import ChatMessages from '../../lib/models/ChatMessages';
import ChatNotifications from '../../lib/models/ChatNotifications';
import MeteorUsers from '../../lib/models/MeteorUsers';
import Hookset from './Hookset';

const DingwordHooks: Hookset = {
  async onChatMessageCreated(chatMessageId: string) {
    // Respect feature flag.
    if (Flags.active('disable.dingwords')) {
      return;
    }

    const chatMessage = (await ChatMessages.findOneAsync(chatMessageId))!;

    if (!chatMessage.sender) {
      // Don't notify for system messages.
      return;
    }

    const normalizedText = chatMessage.text.trim().toLowerCase();

    // Find all users who are in this hunt with dingwords set.
    for await (const u of MeteorUsers.find({
      hunts: chatMessage.hunt,
      'dingwords.0': { $exists: true },
    }, {
      fields: { _id: 1, dingwords: 1 },
    })) {
      // Avoid making users ding themselves.
      if (u._id === chatMessage.sender) {
        continue;
      }

      const dingwords = u.dingwords;
      if (dingwords) {
        const matches = dingwords.some((dingword) => normalizedText.includes(dingword));
        if (matches) {
          await ChatNotifications.insertAsync({
            user: u._id,
            sender: chatMessage.sender,
            puzzle: chatMessage.puzzle,
            hunt: chatMessage.hunt,
            text: chatMessage.text,
            timestamp: chatMessage.timestamp,
          });
        }
      }
    }
  },
};

export default DingwordHooks;
