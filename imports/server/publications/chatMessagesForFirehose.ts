import { check } from "meteor/check";
import ChatMessages from "../../lib/models/ChatMessages";
import MeteorUsers from "../../lib/models/MeteorUsers";
import Puzzles from "../../lib/models/Puzzles";
import chatMessagesForFirehose from "../../lib/publications/chatMessagesForFirehose";
import definePublication from "./definePublication";

definePublication(chatMessagesForFirehose, {
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

    return [
      ChatMessages.find({ hunt: huntId }),
      Puzzles.findAllowingDeleted({ hunt: huntId }),
    ];
  },
});
