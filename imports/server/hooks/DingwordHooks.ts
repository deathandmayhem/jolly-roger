import Flags from '../../Flags';
import ChatMessages from '../../lib/models/ChatMessages';
import ChatNotifications from '../../lib/models/ChatNotifications';
import MeteorUsers from '../../lib/models/MeteorUsers';
import { ChatMessageContentType, nodeIsMention, nodeIsText } from '../../lib/schemas/ChatMessage';
import Hookset from './Hookset';

// TODO: rename this to "ChatNotificationHooks" because we probably want to dedupe notifs
// for dingwords and @-mentions
const DingwordHooks: Hookset = {
  async onChatMessageCreated(chatMessageId: string) {
    // This method implements notifications for both Dingwords and @-mentions together,
    // so that we do not generate duplicate notifications if a user is both @-mentioned
    // and one of their dingwords is spoken in the same breath.

    // Dingwords can be disabled (they're comparatively expensive, since they do big-O(users) work),
    // but @-mentions cannot (they're cheap, doing big-O(message components) work).

    const chatMessage = (await ChatMessages.findOneAsync(chatMessageId))!;

    // Collect users to notify into a set, and then create notifications at the end.
    const usersToNotify = new Set<string>();
    if (!chatMessage.sender) {
      // Don't notify for system messages.
      return;
    }

    // Notify for @-mentions in message.
    if (chatMessage.content) {
      const content = chatMessage.content as ChatMessageContentType;
      content.children.forEach((child) => {
        if (nodeIsMention(child)) {
          const user = child.userId;
          if (user !== chatMessage.sender) {
            // Don't have messages notify yourself.
            usersToNotify.add(user);
          }
        }
      });
    }

    // Respect feature flag.
    if (!Flags.active('disable.dingwords')) {
      const normalizedText = chatMessage.text?.trim().toLowerCase() ??
        (chatMessage.content as ChatMessageContentType | undefined)?.children.map((child) => {
          if (nodeIsText(child)) {
            return child.text;
          } else {
            // No need to look for dingwords in @-mentions, but let them split words
            return ' ';
          }
        }).join('').trim().toLowerCase() ?? '';

      // Find all users who are in this hunt with dingwords set.
      for await (const u of MeteorUsers.find({
        hunts: chatMessage.hunt,
        'dingwords.0': { $exists: true },
      }, {
        fields: { _id: 1, dingwords: 1 },
      })) {
        // Avoid making users ding themselves.
        if (u._id === chatMessage.sender) {
          // eslint-disable-next-line no-continue
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
              content: chatMessage.content,
              timestamp: chatMessage.timestamp,
            });
          }
        }
      }
    }

    // Create notifications for each user who should be dinged by this message.
    const collected: string[] = [];
    usersToNotify.forEach((userId) => {
      collected.push(userId);
    });
    await Promise.all(collected.map(async (userId: string) => {
      await ChatNotifications.insertAsync({
        user: userId,
        sender: chatMessage.sender,
        puzzle: chatMessage.puzzle,
        hunt: chatMessage.hunt,
        text: chatMessage.text,
        content: chatMessage.content,
        timestamp: chatMessage.timestamp,
      });
    }));
  },
};

export default DingwordHooks;
