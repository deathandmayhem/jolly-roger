import Flags from "../../Flags";
import {
  normalizedForDingwordSearch,
  normalizedMessageDingsUserByDingword,
} from "../../lib/dingwordLogic";
import ChatMessages from "../../lib/models/ChatMessages";
import ChatNotifications from "../../lib/models/ChatNotifications";
import MeteorUsers from "../../lib/models/MeteorUsers";
import UserStatuses from "../../lib/models/UserStatuses";
import nodeIsMention from "../../lib/nodeIsMention";
import nodeIsRoleMention from "../../lib/nodeIsRoleMention";
import { queryOperatorsForHunt } from "../../lib/permission_stubs";
import type Hookset from "./Hookset";

const ChatNotificationHooks: Hookset = {
  name: "ChatNotificationHooks",

  async onChatMessageCreated(chatMessageId: string) {
    // This method implements notifications for both Dingwords and @-mentions together,
    // so that we do not generate duplicate notifications if a user is both @-mentioned
    // and one of their dingwords is spoken in the same breath.

    // Dingwords can be disabled (they're comparatively expensive, since they do big-O(users) work),
    // but @-mentions cannot (they're cheap, doing big-O(message components) work).

    const chatMessage = (await ChatMessages.findOneAsync(chatMessageId))!;
    const { sender } = chatMessage;

    if (!sender) {
      // Don't notify for system messages.
      return;
    }

    await UserStatuses.upsertAsync(
      {
        hunt: chatMessage.hunt,
        user: sender,
        type: "puzzleStatus",
      },
      {
        $set: {
          status: "chat",
          puzzle: chatMessage.puzzle,
        },
      },
    );

    // Collect users to notify into a Map, and then create notifications at the end.
    const usersToNotify = new Map<string, string[]>();

    const addUserToNotify = (userId: string, words: string[] = []) => {
      const existing = usersToNotify.get(userId) || [];
      // Combine unique words
      usersToNotify.set(userId, [...new Set([...existing, ...words])]);
    };

    // Notify for @-mentions in message.
    await Promise.all(
      chatMessage.content.children.map(async (child) => {
        if (nodeIsMention(child)) {
          const mentionedUserId = child.userId;
          // Don't have messages notify yourself.
          if (mentionedUserId !== sender) {
            // Only create mentions for users that are in the current hunt.
            const mentionedUser =
              await MeteorUsers.findOneAsync(mentionedUserId);
            if (mentionedUser?.hunts?.includes(chatMessage.hunt)) {
              addUserToNotify(mentionedUserId);
            }
          }
        }
        if (nodeIsRoleMention(child) && child.roleId === "operator") {
          const allOperators = await MeteorUsers.find(
            queryOperatorsForHunt({ _id: chatMessage.hunt }),
          ).mapAsync((u) => u._id);

          for (const opId of allOperators) {
            if (opId !== sender) addUserToNotify(opId);
          }
        }
      }),
    );

    // Respect feature flag.
    if (!(await Flags.activeAsync("disable.dingwords"))) {
      const normalizedText = normalizedForDingwordSearch(chatMessage);

      // Find all users who are in this hunt with dingwords set.
      for await (const u of MeteorUsers.find(
        {
          hunts: chatMessage.hunt,
          "dingwords.0": { $exists: true },
          _id: { $ne: sender }, // Avoid making users ding themselves
        },
        {
          projection: {
            _id: 1,
            dingwords: 1,
            dingwordsOpenMatch: 1,
            suppressedDingwords: 1,
          },
        },
      )) {
        const matches = normalizedMessageDingsUserByDingword(normalizedText, u);
        // Filter out matches that are suppressed for this specific puzzle
        const puzzleSuppressed =
          u.suppressedDingwords?.[chatMessage.hunt]?.[chatMessage.puzzle] || [];
        if (!puzzleSuppressed.includes("__ALL__")) {
          const activeMatches = matches.filter(
            (word) => !puzzleSuppressed.includes(word),
          );
          if (activeMatches.length > 0) {
            addUserToNotify(u._id, activeMatches);
          }
        }
      }
    }

    const notificationPromises: Promise<string>[] = [];

    // Create notifications for each user who should be dinged by this message.
    usersToNotify.forEach((words, userId) => {
      notificationPromises.push(
        ChatNotifications.insertAsync({
          user: userId,
          sender,
          puzzle: chatMessage.puzzle,
          hunt: chatMessage.hunt,
          content: chatMessage.content,
          timestamp: chatMessage.timestamp,
          message: chatMessage._id,
          // Store the matches so the UI knows which word to offer to ignore
          dingwords: words.length > 0 ? words : undefined,
        }),
      );
    });

    await Promise.all(notificationPromises);
  },
};

export default ChatNotificationHooks;
