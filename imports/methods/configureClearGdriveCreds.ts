import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Settings.methods.clearGdriveCreds",
  z.tuple([]),
  z.void(),
);
