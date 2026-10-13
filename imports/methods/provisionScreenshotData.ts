import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Screenshots.methods.provisionData",
  z.tuple([]),
  z.void(),
);
