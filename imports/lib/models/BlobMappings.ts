import { z } from "zod";
import { nonEmptyString } from "./customTypes";
import type { ModelType } from "./Model";
import Model from "./Model";

// Note that the _id is the asset name
const BlobMapping = z.object({
  // blob is the sha256 of the asset, which is the _id of the Blob
  blob: z.string().regex(/^[a-fA-F0-9]{64}$/),
});

const BlobMappings = new Model("jr_blob_mappings", BlobMapping, nonEmptyString);
export type BlobMappingType = ModelType<typeof BlobMappings>;

export default BlobMappings;
