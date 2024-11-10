import { Meteor } from "meteor/meteor";
import ChatMessages from "../lib/models/ChatMessages";
import type { ChatMessageContentType } from "../lib/models/ChatMessages";
import Puzzles from "../lib/models/Puzzles";
import GlobalHooks from "./GlobalHooks";

export default async function sendChatMessageInternal({
  puzzleId,
  content,
  sender,
  pinned,
}: {
  puzzleId: string;
  content: ChatMessageContentType;
  sender: string | undefined;
  pinned: boolean;
}) {
  const puzzle = await Puzzles.findOneAsync(puzzleId);
  if (!puzzle) {
    throw new Meteor.Error(404, "Unknown puzzle");
  }

  const msgId = await ChatMessages.insertAsync({
    puzzle: puzzleId,
    hunt: puzzle.hunt,
    content,
    sender,
    pinned,
    timestamp: new Date(),
  });

  await GlobalHooks.runChatMessageCreatedHooks(msgId);
}
