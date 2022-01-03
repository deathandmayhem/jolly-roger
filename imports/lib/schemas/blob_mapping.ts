import * as t from 'io-ts';
import { Overrides, buildSchema } from './typedSchemas';

export const BlobMappingCodec = t.type({
  // _id is the asset name
  _id: t.string,

  // blob is the sha256 of the asset, which is the _id of the Blob
  blob: t.string,
});

export type BlobMappingType = t.TypeOf<typeof BlobMappingCodec>;

const BlobMappingOverrides: Overrides<BlobMappingType> = {};

const BlobMapping = buildSchema(BlobMappingCodec, BlobMappingOverrides);

export default BlobMapping;
