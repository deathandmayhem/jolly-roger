import { Meteor } from 'meteor/meteor';
import ChatMessages from '../lib/models/ChatMessages';
import Puzzles from '../lib/models/Puzzles';
import GlobalHooks from './GlobalHooks';

export default function sendChatMessageInternal({ puzzleId, message, sender }: {
  puzzleId: string,
  message: string,
  sender: string | undefined,
}) {
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
}
