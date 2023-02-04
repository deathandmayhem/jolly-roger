import { check } from 'meteor/check';
import ChatMessages from '../../lib/models/ChatMessages';
import type Hunts from '../../lib/models/Hunts';
import MeteorUsers from '../../lib/models/MeteorUsers';
import { makeForeignKeyMatcher } from '../../lib/models/Model';
import chatMessagesForPuzzle from '../../lib/publications/chatMessagesForPuzzle';
import definePublication from './definePublication';

definePublication(chatMessagesForPuzzle, {
  validate(arg) {
    check(arg, {
      puzzleId: String,
      huntId: makeForeignKeyMatcher<typeof Hunts>(),
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
