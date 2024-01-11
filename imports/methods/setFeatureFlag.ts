import type { FlagNames } from "../lib/models/FeatureFlags";
import TypedMethod from "./TypedMethod";

type SetFeatureFlagArgs = {
  name: (typeof FlagNames)[number];
  type: "on" | "off";
};

export default new TypedMethod<SetFeatureFlagArgs, void>(
  "FeatureFlags.methods.set",
);
