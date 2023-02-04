import { check, Match } from 'meteor/check';
import type Hunts from '../../lib/models/Hunts';
import MeteorUsers from '../../lib/models/MeteorUsers';
import { makeForeignKeyMatcher } from '../../lib/models/Model';
import Puzzles from '../../lib/models/Puzzles';
import puzzlesForHunt from '../../lib/publications/puzzlesForHunt';
import definePublication from './definePublication';

definePublication(puzzlesForHunt, {
  validate(arg) {
    check(arg, {
      huntId: makeForeignKeyMatcher<typeof Hunts>(),
      includeDeleted: Match.Optional(Boolean),
    });
    return arg;
  },

  async run({ huntId, includeDeleted = false }) {
    if (!this.userId) {
      return [];
    }

    const user = await MeteorUsers.findOneAsync(this.userId);
    if (!user?.hunts?.includes(huntId)) {
      return [];
    }

    return Puzzles[includeDeleted ? 'findAllowingDeleted' : 'find']({ hunt: huntId });
  },
});
