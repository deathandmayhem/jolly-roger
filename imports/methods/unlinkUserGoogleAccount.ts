import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Users.methods.unlinkGoogleAccount",
  z.tuple([]),
  z.void(),
);
