import { z } from "zod";
import { foreignKey } from "./customTypes";
import { GoogleProviderSchema } from "./GoogleDocSchema";
import Model from "./Model";
import withCommon from "./withCommon";

const CachedDocumentSchema = withCommon(
  z
    .object({
      hunt: foreignKey,
      // Note: No puzzle foreignKey here yet, as it's not claimed
      status: z.enum(["available", "claimed"]),
    })
    .and(GoogleProviderSchema),
);

const CachedDocuments = new Model("jr_cached_documents", CachedDocumentSchema);

CachedDocuments.addIndex({ hunt: 1, status: 1, "value.type": 1 });

export type CachedDocumentType = z.infer<typeof CachedDocumentSchema>;
export default CachedDocuments;
