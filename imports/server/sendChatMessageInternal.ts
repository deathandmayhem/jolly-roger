import { Meteor } from 'meteor/meteor';
import ChatMessages from '../lib/models/ChatMessages';
import Puzzles from '../lib/models/Puzzles';
import GlobalHooks from './GlobalHooks';

export default async function sendChatMessageInternal({ puzzleId, message, sender }: {
  puzzleId: string,
  message: string,
  sender: string | undefined,
}) {
  const puzzle = await Puzzles.findOneAsync(puzzleId);
  if (!puzzle) {
    throw new Meteor.Error(404, 'Unknown puzzle');
  }

  const msgId = await ChatMessages.insertAsync({
    puzzle: puzzleId,
    hunt: puzzle.hunt,
    text: message,
    sender,
    timestamp: new Date(),
  });

  await GlobalHooks.runChatMessageCreatedHooks(msgId);
}
