import { Meteor } from 'meteor/meteor';
import { ChatMessageType, nodeIsMention, nodeIsText } from './schemas/ChatMessage';

const NeededChatFields = ['text', 'content', 'sender'] as const;
type PartialChatMessageType = Pick<ChatMessageType, typeof NeededChatFields[number]>

export function normalizedForDingwordSearch(chatMessage: PartialChatMessageType): string {
  return chatMessage.text?.trim().toLowerCase() ??
    chatMessage.content?.children.map((child) => {
      if (nodeIsText(child)) {
        return child.text;
      } else {
        // No need to look for dingwords in @-mentions, but let them split words
        return ' ';
      }
    }).join('').trim().toLowerCase() ?? '';
}

export function normalizedMessageDingsUserByDingword(
  normalizedMessage: string,
  user: Meteor.User
): boolean {
  const words = normalizedMessage.split(/\s+/);
  return (user.dingwords ?? []).some((dingword) => {
    const dingwordLower = dingword.toLowerCase();
    return words.some((word) => word.startsWith(dingwordLower));
  });
}

export function messageDingsUser(chatMessage: PartialChatMessageType, user: Meteor.User): boolean {
  const normalizedText = normalizedForDingwordSearch(chatMessage);
  const dingedByDingwords = normalizedMessageDingsUserByDingword(normalizedText, user);
  const isSystemMessage = !chatMessage.sender;
  const dingedByMentions = !isSystemMessage && chatMessage.sender !== user._id &&
   (chatMessage.content?.children ?? []).some((child) => {
     if (nodeIsMention(child)) {
       return child.userId === user._id;
     } else {
       return false;
     }
   });
  return dingedByDingwords || dingedByMentions;
}
