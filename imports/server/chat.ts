import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import ChatMessages from '../lib/models/ChatMessages';
import Puzzles from '../lib/models/Puzzles';
import GlobalHooks from './GlobalHooks';

// eslint-disable-next-line import/prefer-default-export
export const sendChatMessage = (puzzleId: string, message: string, sender: string | undefined) => {
  const puzzle = Puzzles.findOne(puzzleId);
  if (!puzzle) {
    throw new Meteor.Error(404, 'Unknown puzzle');
  }

  const msgId = ChatMessages.insert({
    puzzle: puzzleId,
    hunt: puzzle.hunt,
    text: message,
    sender,
    timestamp: new Date(),
  });

  GlobalHooks.runChatMessageCreatedHooks(msgId);
};

Meteor.methods({
  sendChatMessage(puzzleId: unknown, message: unknown) {
    check(this.userId, String);
    check(puzzleId, String);
    check(message, String);

    sendChatMessage(puzzleId, message, this.userId);
  },
});
