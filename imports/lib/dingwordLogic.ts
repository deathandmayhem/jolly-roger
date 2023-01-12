import { Meteor } from 'meteor/meteor';
import { ChatMessageType, nodeIsMention, nodeIsText } from './schemas/ChatMessage';

export function normalizedForDingwordSearch(chatMessage: ChatMessageType): string {
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
  return (user.dingwords ?? []).some((dingword) => {
    return normalizedMessage.includes(dingword);
  });
}

export function messageDingsUser(chatMessage: ChatMessageType, user: Meteor.User): boolean {
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
