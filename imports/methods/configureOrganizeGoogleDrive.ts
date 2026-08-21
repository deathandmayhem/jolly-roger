import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Settings.methods.organizeGoogleDrive",
  z.tuple([]),
  z.void(),
);
