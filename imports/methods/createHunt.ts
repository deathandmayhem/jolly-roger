import z from "zod";
import { EditableHunt } from "../lib/models/Hunts";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Hunts.methods.create",
  z.tuple([EditableHunt]),
  z.string(),
);
