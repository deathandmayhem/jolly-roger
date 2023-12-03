import { check } from 'meteor/check';
import ChatMessages from '../../lib/models/ChatMessages';
import MeteorUsers from '../../lib/models/MeteorUsers';
import definePublication from './definePublication';

definePublication(ChatMessages.publications.forPuzzle, {
  validate(arg) {
    check(arg, {
      puzzleId: String,
      huntId: String,
    });
    return arg;
  },

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
