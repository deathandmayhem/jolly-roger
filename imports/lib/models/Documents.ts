import { z } from "zod";
import { foreignKey } from "./customTypes";
import type { ModelType } from "./Model";
import SoftDeletedModel from "./SoftDeletedModel";
import withCommon from "./withCommon";
import { GoogleDocumentValueSchema } from "./GoogleDocSchema";

export const DOCUMENT_TYPES = ["spreadsheet", "document", "drawing"];

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
          value: GoogleDocumentValueSchema,
        }),
      ]),
    ),
);

const Documents = new SoftDeletedModel("jr_documents", DocumentSchema);
Documents.addIndex({ deleted: 1, puzzle: 1 });
Documents.addIndex({ "value.id": 1 });
export type DocumentType = ModelType<typeof Documents>;

export default Documents;
