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
): boolean {
  return (user.dingwords ?? []).some((dingword) => {
    if (user.dingwordsOpenMatch) {
      return normalizedMessage.match(new RegExp(`\\b${dingword}`, "i"));
    }
    return normalizedMessage.match(new RegExp(`\\b${dingword}\\b`, "i"));
  });
}

export function normalizedMessageDingsUserByDingwordOnce(
  normalizedMessage: string,
  user: Pick<
    Meteor.User,
    "dingwordsMatchOnce" | "dingwordsMatchedOnce" | "dingwordsOpenMatch"
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

export function messageDingsUser(
  chatMessage: PartialChatMessageType,
  user: Meteor.User,
): boolean {
  if (chatMessage.sender === user._id || chatMessage.sender === undefined) {
    // You can never be dinged by yourself, nor by system messages.
    return false;
  }
  const normalizedText = normalizedForDingwordSearch(chatMessage);
  const dingedByDingwords = normalizedMessageDingsUserByDingword(
    normalizedText,
    user,
  );
  const dingedByMentions = (chatMessage.content?.children ?? []).some(
    (child) => {
      if (nodeIsMention(child)) {
        return child.userId === user._id;
      } else {
        return false;
      }
    },
  );
  const roles = listAllRolesForHunt(user, { _id: chatMessage.hunt });
  const dingedByRoleMentions = (chatMessage.content?.children ?? []).some(
    (child) => {
      if (nodeIsRoleMention(child)) {
        return roles.includes(child.roleId);
      } else {
        return false;
      }
    },
  );
  return dingedByDingwords || dingedByMentions || dingedByRoleMentions;
}
