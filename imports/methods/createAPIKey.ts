import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "APIKeys.method.create",
  z.tuple([]),
  z.string(),
);
