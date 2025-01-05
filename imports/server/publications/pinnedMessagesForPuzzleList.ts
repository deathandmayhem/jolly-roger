import { check } from "meteor/check";
import ChatMessages from "../../lib/models/ChatMessages";
import MeteorUsers from "../../lib/models/MeteorUsers";
import definePublication from "./definePublication";
import pinnedMessagesForPuzzleList from "../../lib/publications/pinnedMessagesForPuzzleList";

definePublication(pinnedMessagesForPuzzleList, {
  validate(arg) {
    check(arg, {
      huntId: String,
    });
    return arg;
  },

  async run({ huntId }) {
    if (!this.userId) {
      return [];
    }

    const user = await MeteorUsers.findOneAsync(this.userId);
    if (!user?.hunts?.includes(huntId)) {
      return [];
    }

    return ChatMessages.find({
      hunt: huntId,
      pinTs: { $ne:null },
    });
  },
});
