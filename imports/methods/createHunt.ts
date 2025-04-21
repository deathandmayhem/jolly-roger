import { HuntPattern } from "../lib/models/Hunts";
import TypedMethod from "./TypedMethod";

export const CreateHuntPayloadSchema = {
  ...HuntPattern,
  initialTags: String,
};

export default new TypedMethod<CreateHuntPayloadSchema, string>(
  "Hunts.methods.create",
);
