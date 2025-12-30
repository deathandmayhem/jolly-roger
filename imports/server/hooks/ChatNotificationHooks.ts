import Flags from "../../Flags";
import {
  normalizedForDingwordSearch,
  normalizedMessageDingsUserByDingword,
  normalizedMessageDingsUserByDingwordOnce,
} from "../../lib/dingwordLogic";
import ChatMessages from "../../lib/models/ChatMessages";
import ChatNotifications from "../../lib/models/ChatNotifications";
import MeteorUsers from "../../lib/models/MeteorUsers";
import UserStatuses from "../../lib/models/UserStatuses";
import nodeIsMention from "../../lib/nodeIsMention";
import nodeIsRoleMention from "../../lib/nodeIsRoleMention";
import { queryOperatorsForHunt } from "../../lib/permission_stubs";
import Subscribers from "../models/Subscribers";
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

    // Collect users to notify into a set, and then create notifications at the end.
    const usersToNotify = new Set<string>();
    const matchOnceUpdates: { userId: string; words: string[] }[] = [];

    if (!sender) {
      // Don't notify for system messages.
      return;
    }

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
              usersToNotify.add(mentionedUserId);
            }
          }
        }
        if (nodeIsRoleMention(child)) {
          const roleId = child.roleId;
          if (roleId === "operator") {
            // First check for all active operators
            const subscribed = await Subscribers.find({
              name: "operators",
              [`context.${chatMessage.hunt}`]: true,
            }).mapAsync((l) => l.user as string);

            const allOperators = await MeteorUsers.find(
              queryOperatorsForHunt({ _id: chatMessage.hunt }),
            ).mapAsync((u) => u._id);

            const active = new Set(allOperators).intersection(
              new Set(subscribed),
            );
            active.delete(sender); // don't notify self
            if (active.size > 0) {
              active.forEach((userId) => usersToNotify.add(userId));
            } else {
              // No active operators; fall back to all operators
              allOperators.forEach((userId) => {
                if (userId !== sender) {
                  usersToNotify.add(userId);
                }
              });
            }
          } else {
            // biome-ignore lint/nursery/noUnusedExpressions: exhaustive check
            roleId satisfies never;
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
        },
        {
          projection: {
            _id: 1,
            dingwords: 1,
            dingwordsOpenMatch: 1,
            dingwordsMatchOnce: 1,
            dingwordsMatchedOnce: 1,
          },
        },
      )) {
        // Avoid making users ding themselves.
        if (u._id === sender) {
          continue;
        }

        if (normalizedMessageDingsUserByDingword(normalizedText, u)) {
          usersToNotify.add(u._id);
        }

        const onceOnlyMatches = normalizedMessageDingsUserByDingwordOnce(
          normalizedText,
          u,
          chatMessage,
        );
        if (onceOnlyMatches.length > 0) {
          usersToNotify.add(u._id);
          matchOnceUpdates.push({
            userId: u._id,
            words: onceOnlyMatches,
          });
        }
      }
    }

    // Create notifications for each user who should be dinged by this message.
    const collected: string[] = [];
    usersToNotify.forEach((userId) => {
      collected.push(userId);
    });
    await Promise.all(
      collected.map(async (userId: string) => {
        await ChatNotifications.insertAsync({
          user: userId,
          sender,
          puzzle: chatMessage.puzzle,
          hunt: chatMessage.hunt,
          content: chatMessage.content,
          timestamp: chatMessage.timestamp,
          message: chatMessage._id,
        });
      }),
    );

    if (matchOnceUpdates.length > 0) {
      const bulkUpdate = matchOnceUpdates.map(({ userId, words }) => ({
        updateOne: {
          filter: { _id: userId },
          update: {
            $addToSet: {
              [`dingwordsMatchedOnce.${chatMessage.hunt}.${chatMessage.puzzle}`]:
                { $each: words },
            },
          },
        },
      }));
      if (bulkUpdate.length > 0) {
        await MeteorUsers.rawCollection().bulkWrite(bulkUpdate, {
          ordered: false,
        });
      }
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
  },
};

export default ChatNotificationHooks;
