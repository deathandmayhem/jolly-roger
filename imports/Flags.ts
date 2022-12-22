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

  observeChanges(name: unknown, cb: (active: boolean) => void) {
    check(name, String);
    check(cb, Function);

    let state: boolean | undefined;
    const checkUpdate = () => {
      const active = Flags.active(name);
      if (state !== active) {
        state = active;
        cb(active);
      }
    };
    const handle = FeatureFlags.find({ name }).observeChanges({
      added: checkUpdate,
      changed: checkUpdate,
      removed: checkUpdate,
    });

    // If state is still undefined, then the record does not exist yet and we
    // should explicitly initialize it to false.
    if (state === undefined) {
      checkUpdate();
    }

    return handle;
  },
};

export default Flags;
