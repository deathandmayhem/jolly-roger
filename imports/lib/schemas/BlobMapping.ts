import { z } from 'zod';

// Note that the _id is the asset name
const BlobMapping = z.object({
  // blob is the sha256 of the asset, which is the _id of the Blob
  blob: z.string().regex(/^[a-fA-F0-9]{64}$/),
});

export default BlobMapping;
