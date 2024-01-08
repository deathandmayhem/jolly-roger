import type { EditableHuntType } from "../lib/models/Hunts";
import TypedMethod from "./TypedMethod";

export default new TypedMethod<EditableHuntType, string>(
  "Hunts.methods.create",
);
