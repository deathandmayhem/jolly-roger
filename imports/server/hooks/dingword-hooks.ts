import { Meteor } from 'meteor/meteor';
import Flags from '../../flags';
import ChatNotifications from '../../lib/models/chat_notifications';
import ChatMessages from '../../lib/models/chats';
import Profiles from '../../lib/models/profiles';
import Hookset from './hookset';

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

    // Find all users who are in this hunt.
    const huntMembers = Meteor.users.find({
      hunts: chatMessage.hunt,
    }, {
      fields: { _id: 1 },
    }).fetch().map((u) => {
      return u._id;
    });

    // Fetch the profiles of all those users.
    const memberProfiles = Profiles.find({
      _id: {
        $in: huntMembers,
      },
      'dingwords.0': { $exists: true },
    }, { fields: { dingwords: 1 } });

    // For each user with dingwords, check if this message (normalized to
    // lower-case) triggers any of their dingwords.
    const normalizedText = chatMessage.text.trim().toLowerCase();
    memberProfiles.forEach((p) => {
      // Avoid making users ding themselves.
      if (p._id === chatMessage.sender) {
        return;
      }

      const dingwords = p.dingwords;
      if (dingwords) {
        for (let i = 0; i < dingwords.length; i++) {
          const dingword = dingwords[i];
          if (normalizedText.indexOf(dingword) !== -1) {
            // It matched!  We should notify the user of this message.

            // console.log(`u ${p._id} dingword ${dingword} matched message ${chatMessage.text}`);
            ChatNotifications.insert({
              user: p._id,
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
