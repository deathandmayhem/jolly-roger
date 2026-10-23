import z from "zod";
import TypedMethod from "./TypedMethod";

export default new TypedMethod(
  "Setup.methods.configureGdriveTemplates",
  z.tuple([
    z.strictObject({
      spreadsheetTemplate: z.string().optional(),
      documentTemplate: z.string().optional(),
    }),
  ]),
  z.void(),
);
