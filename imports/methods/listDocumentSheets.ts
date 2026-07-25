import z from "zod";
import TypedMethod from "./TypedMethod";

const Sheet = z.object({
  name: z.string(),
  id: z.number(),
});
export type Sheet = z.infer<typeof Sheet>;

export default new TypedMethod(
  "Documents.methods.listSheets",
  z.tuple([
    z.strictObject({
      documentId: z.string(),
    }),
  ]),
  Sheet.array(),
);
