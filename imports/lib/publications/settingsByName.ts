import z from "zod";
import { SettingNames } from "../models/Settings";
import TypedPublication from "./TypedPublication";

export default new TypedPublication(
  "Settings.publications.byName",
  z.tuple([
    z.strictObject({
      name: z.enum(SettingNames),
    }),
  ]),
);
