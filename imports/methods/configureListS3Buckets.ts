import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Setup.methods.listS3Buckets",
  z.tuple([]),
  z.string().array(),
);
