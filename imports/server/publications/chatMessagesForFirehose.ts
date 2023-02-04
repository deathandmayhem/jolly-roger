import { check } from 'meteor/check';
import ChatMessages from '../../lib/models/ChatMessages';
import type Hunts from '../../lib/models/Hunts';
import MeteorUsers from '../../lib/models/MeteorUsers';
import { makeForeignKeyMatcher } from '../../lib/models/Model';
import Puzzles from '../../lib/models/Puzzles';
import chatMessagesForFirehose from '../../lib/publications/chatMessagesForFirehose';
import publishJoinedQuery from '../publishJoinedQuery';
import definePublication from './definePublication';

definePublication(chatMessagesForFirehose, {
  validate(arg) {
    check(arg, {
      huntId: makeForeignKeyMatcher<typeof Hunts>(),
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

    publishJoinedQuery(this, {
      model: ChatMessages,
      foreignKeys: [{
        field: 'puzzle',
        join: {
          model: Puzzles,
          allowDeleted: true,
        },
      }],
    }, { hunt: huntId });

    this.ready();
    return undefined;
  },
});
