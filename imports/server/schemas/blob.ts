import * as t from 'io-ts';
import { Overrides, buildSchema } from '../../lib/schemas/typedSchemas';
import { uint8Array } from '../../lib/schemas/types';

export const BlobCodec = t.type({
  // Blob contents
  value: uint8Array,
  // Browser-detected MIME type, like 'image/png'
  mimeType: t.string,
  // ASCII hex string of the md5 digest of the blob contents, like
  // 'd41d8cd98f00b204e9800998ecf8427e'
  md5: t.string,
  // Size, in bytes, of the blob contents.
  size: t.number,
});

export type BlobType = t.TypeOf<typeof BlobCodec>;

const BlobOverrides: Overrides<BlobType> = {};

const Blob = buildSchema(BlobCodec, BlobOverrides);

export default Blob;
