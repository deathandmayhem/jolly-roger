import { z } from "zod";
import type { ModelType } from "./Model";
import SoftDeletedModel from "./SoftDeletedModel";
import { foreignKey, nonEmptyString } from "./customTypes";
import withCommon from "./withCommon";

const DocumentSchema = withCommon(
  z
    .object({
      hunt: foreignKey,
      puzzle: foreignKey,
    })
    .and(
      z.discriminatedUnion("provider", [
        z.object({
          provider: z.literal("google"),
          value: z.object({
            type: z.enum(["spreadsheet", "document"]),
            id: nonEmptyString,
            folder: nonEmptyString.optional(),
          }),
        }),
      ]),
    ),
);

const Documents = new SoftDeletedModel("jr_documents", DocumentSchema);
Documents.addIndex({ deleted: 1, puzzle: 1 });
Documents.addIndex({ "value.id": 1 });
export type DocumentType = ModelType<typeof Documents>;

export default Documents;
