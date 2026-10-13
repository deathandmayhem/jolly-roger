import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Settings.methods.collectGoogleAccountIds",
  z.tuple([]),
  z.void(),
);
