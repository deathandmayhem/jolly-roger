import { check } from 'meteor/check';
import { Meteor } from 'meteor/meteor';
import ChatMessages from '../lib/models/chats';
import Puzzles from '../lib/models/puzzles';

Meteor.methods({
  sendChatMessage(puzzleId: unknown, message: unknown) {
    check(this.userId, String);
    check(puzzleId, String);
    check(message, String);

    const puzzle = Puzzles.findOne(puzzleId);
    if (!puzzle) {
      throw new Meteor.Error(404, 'Unknown puzzle');
    }

    ChatMessages.insert({
      puzzle: puzzleId,
      hunt: puzzle.hunt,
      text: message,
      sender: this.userId,
      timestamp: new Date(),
    });
  },
});
