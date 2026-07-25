import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Hunts.methods.createFixture",
  z.tuple([]),
  z.void(),
);
