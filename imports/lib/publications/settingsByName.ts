import type { SettingNameType } from "../models/Settings";
import TypedPublication from "./TypedPublication";

export default new TypedPublication<{ name: SettingNameType }>(
  "Settings.publications.byName",
);
