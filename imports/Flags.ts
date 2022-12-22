import { check } from 'meteor/check';
import FeatureFlags from './lib/models/FeatureFlags';

const Flags = {
  active(name: unknown) {
    check(name, String);

    const flag = FeatureFlags.findOne({ name });
    if (!flag) {
      return false;
    }

    switch (flag.type) {
      case 'on':
        return true;
      case 'off':
        return false;
      default:
        return false;
    }
  },
};

export default Flags;
