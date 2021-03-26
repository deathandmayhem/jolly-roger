import * as t from 'io-ts';
import { Overrides, buildSchema } from '../../lib/schemas/typedSchemas';

export const BlobCodec = t.type({
  // Base64-encoded blob contents (since Mongo don't play well with null bytes
  // in string types, and Meteor doesn't play well with Mongo's binary types)
  value: t.string,
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
