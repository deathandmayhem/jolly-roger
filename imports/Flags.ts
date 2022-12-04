import { Match, check } from 'meteor/check';
import { SHA256 } from 'meteor/sha';
import FeatureFlags from './lib/models/FeatureFlags';

const Flags = {
  active(name: unknown, shard?: unknown) {
    check(name, String);
    check(shard, Match.Maybe(String));

    const flag = FeatureFlags.findOne({ name });
    if (!flag) {
      return false;
    }

    switch (flag.type) {
      case 'on':
        return true;
      case 'random_by': {
        // eslint-disable-next-line new-cap
        const hash = SHA256(`${name}.${shard}`);
        // Use the first 48 bits (6 bytes) and convert to a float
        const float = parseInt(hash.slice(0, 6), 16) / 0xffffff;
        return float < (flag.random ?? 0);
      }
      case 'off':
        return false;
      default:
        return false;
    }
  },
};

export default Flags;
