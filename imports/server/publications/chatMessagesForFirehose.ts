import { check } from 'meteor/check';
import ChatMessages from '../../lib/models/ChatMessages';
import MeteorUsers from '../../lib/models/MeteorUsers';
import Puzzles from '../../lib/models/Puzzles';
import publishJoinedQuery from '../publishJoinedQuery';
import definePublication from './definePublication';

definePublication(ChatMessages.publications.forFirehose, {
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
