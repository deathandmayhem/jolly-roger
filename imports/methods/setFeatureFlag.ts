import z from "zod";
import { FlagNames } from "../lib/models/FeatureFlags";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "FeatureFlags.methods.set",
  z.tuple([
    z.strictObject({
      name: z.enum(FlagNames),
      type: z.enum(["off", "on"]),
    }),
  ]),
  z.void(),
);
