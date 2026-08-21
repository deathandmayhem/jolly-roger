import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Setup.methods.ensureGoogleScript",
  z.tuple([]),
  z.void(),
);
