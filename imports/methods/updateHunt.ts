import z from "zod";
import { EditableHunt } from "../lib/models/Hunts";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Hunts.methods.update",
  z.tuple([z.object({ huntId: z.string(), value: EditableHunt })]),
  z.void(),
);
