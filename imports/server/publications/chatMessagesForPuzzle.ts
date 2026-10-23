import ChatMessages from "../../lib/models/ChatMessages";
import MeteorUsers from "../../lib/models/MeteorUsers";
import chatMessagesForPuzzle from "../../lib/publications/chatMessagesForPuzzle";
import definePublication from "./definePublication";

definePublication(chatMessagesForPuzzle, {
  async run({ puzzleId, huntId }) {
    if (!this.userId) {
      return [];
    }

    const user = await MeteorUsers.findOneAsync(this.userId);
    if (!user?.hunts?.includes(huntId)) {
      return [];
    }

    return ChatMessages.find({
      puzzle: puzzleId,
      hunt: huntId,
    });
  },
});
