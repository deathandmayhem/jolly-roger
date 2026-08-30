import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Setup.methods.configureTeamName",
  z.tuple([
    z.strictObject({
      teamName: z.string().optional(),
    }),
  ]),
  z.void(),
);
