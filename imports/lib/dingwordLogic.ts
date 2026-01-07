import type { Meteor } from "meteor/meteor";
import type { ChatMessageType } from "./models/ChatMessages";
import nodeIsMention from "./nodeIsMention";
import nodeIsRoleMention from "./nodeIsRoleMention";
import nodeIsText from "./nodeIsText";
import { listAllRolesForHunt } from "./permission_stubs";

type NeededChatFields = "content" | "sender" | "hunt";
type PartialChatMessageType = Pick<ChatMessageType, NeededChatFields>;

export function normalizedForDingwordSearch(
  chatMessage: PartialChatMessageType,
): string {
  return (
    chatMessage.content?.children
      .map((child) => {
        if (nodeIsText(child)) {
          return child.text;
        } else {
          // No need to look for dingwords in @-mentions, but let them split words
          return " ";
        }
      })
      .join("")
      .trim()
      .toLowerCase() ?? ""
  );
}

export function normalizedMessageDingsUserByDingword(
  normalizedMessage: string,
  user: Meteor.User,
): string[] {
  return (user.dingwords ?? []).filter((dingword) => {
    // Escape the dingword to handle special characters (like ? or *)
    // if users enter them manually
    const escapedDingword = dingword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const regex = user.dingwordsOpenMatch
      ? new RegExp(`\\b${escapedDingword}`, "i")
      : new RegExp(`\\b${escapedDingword}\\b`, "i");

    return regex.test(normalizedMessage);
  });
}

export function normalizedMessageDingsUserByDingwordOnce(
  normalizedMessage: string,
  user: Pick<
    Meteor.User,
    "dingwordsMatchOnce" | "suppressedDingwords" | "dingwordsOpenMatch"
  >,
  message: Pick<ChatMessageType, "hunt" | "puzzle">,
): string[] {
  const potentialDingwords = user.dingwordsMatchOnce;
  if (
    !potentialDingwords ||
    potentialDingwords.length === 0 ||
    !normalizedMessage
  ) {
    return [];
  }
  const usedWordsForPuzzle =
    user.dingwordsMatchedOnce?.[message.hunt]?.[message.puzzle] ?? [];

  const availableDingwords = potentialDingwords.filter(
    (dw) => !usedWordsForPuzzle.includes(dw),
  );

  if (availableDingwords.length === 0) {
    return [];
  }

  const newlyMatchedWords: string[] = [];
  for (const dingword of availableDingwords) {
    if (user.dingwordsOpenMatch) {
      if (normalizedMessage.match(new RegExp(`\\b${dingword}`, "i"))) {
        newlyMatchedWords.push(dingword);
      }
    } else if (normalizedMessage.match(new RegExp(`\\b${dingword}\\b`, "i"))) {
      newlyMatchedWords.push(dingword);
    }
  }

  return newlyMatchedWords;
}

export function dingedByMentions(
  chatMessage: PartialChatMessageType,
  user: Meteor.User,
): boolean {
  return (chatMessage.content?.children ?? []).some(
    (child) => {
      if (nodeIsMention(child)) {
        return child.userId === user._id;
      } else {
        return false;
      }
    },
  );
}

export function dingedByRoleMentions(
  chatMessage: PartialChatMessageType,
  user: Meteor.User,
): boolean {
  const roles = listAllRolesForHunt(user, { _id: chatMessage.hunt });
  return (chatMessage.content?.children ?? []).some(
    (child) => {
      if (nodeIsRoleMention(child)) {
        return roles.includes(child.roleId);
      } else {
        return false;
      }
    },
  );
}

export function messageDingsUser(
  chatMessage: PartialChatMessageType,
  user: Meteor.User,
): boolean {
  if (chatMessage.sender === user._id || chatMessage.sender === undefined) {
    // You can never be dinged by yourself, nor by system messages.
    return false;
  }
  const normalizedText = normalizedForDingwordSearch(chatMessage);
  const dingedByDingwords =
    normalizedMessageDingsUserByDingword(normalizedText, user).length > 0;
  const userDingedByMentions = dingedByMentions(chatMessage, user);
  const userDingedByRoleMentions = dingedByRoleMentions(chatMessage, user);
  return dingedByDingwords || userDingedByMentions || userDingedByRoleMentions;
}
