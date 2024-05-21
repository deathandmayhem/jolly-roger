import { Match, check } from "meteor/check";
import type { FeatureFlagType } from "./lib/models/FeatureFlags";
import FeatureFlags, { FlagNames } from "./lib/models/FeatureFlags";

function flagIsActive(flag: Pick<FeatureFlagType, "type"> | undefined) {
  if (!flag) {
    return false;
  }

  switch (flag.type) {
    case "on":
      return true;
    case "off":
      return false;
    default:
      return false;
  }
}

const Flags = {
  active(name: (typeof FlagNames)[number]) {
    check(name, Match.OneOf(...FlagNames));

    const flag = FeatureFlags.findOne({ name });
    return flagIsActive(flag);
  },

  async activeAsync(name: (typeof FlagNames)[number]) {
    check(name, Match.OneOf(...FlagNames));

    const flag = await FeatureFlags.findOneAsync({ name });
    return flagIsActive(flag);
  },

  async observeChangesAsync(
    name: (typeof FlagNames)[number],
    cb: (active: boolean) => void,
  ) {
    check(name, Match.OneOf(...FlagNames));
    check(cb, Function);

    let state: FeatureFlagType | undefined;
    const checkUpdate = (_id: string, flag?: Partial<FeatureFlagType>) => {
      let newState;
      if (flag) {
        newState = { ...(state ?? {}), ...flag } as FeatureFlagType;
      } else {
        newState = undefined;
      }
      const newActive = flagIsActive(newState);
      if (flagIsActive(state) !== newActive) {
        state = newState;
        cb(newActive);
      }
    };
    const handle = await FeatureFlags.find({ name }).observeChangesAsync({
      added: checkUpdate,
      changed: checkUpdate,
      removed: checkUpdate,
    });

    // If state is still undefined, then the record does not exist yet and we
    // should explicitly initialize it to false.
    if (state === undefined) {
      cb(false);
    }

    return handle;
  },
};

export default Flags;
