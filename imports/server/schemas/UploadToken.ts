import * as t from 'io-ts';
import { BaseCodec, BaseOverrides } from '../../lib/schemas/Base';
import type { Overrides } from '../../lib/schemas/typedSchemas';
import { buildSchema, inheritSchema } from '../../lib/schemas/typedSchemas';

// A way to authenticate uploads before accepting them.
// The flow is:
// * client calls Meteor method to request an upload token, which checks auth
//   and then generates an upload token
// * server creates an upload token and returns the _id to the client
// * client does a post to /fileUpload/:_id , and since _id is unguessable, we
//   can treat this as authenticated and complete whatever task was started before
//   the upload was initiated.
export const UploadTokenFields = t.type({
  asset: t.string,
  mimeType: t.string,
});

const UploadTokenFieldsOverrides: Overrides<t.TypeOf<typeof UploadTokenFields>> = {};

const [UploadTokenCodec, UploadTokenOverrides] = inheritSchema(
  BaseCodec,
  UploadTokenFields,
  BaseOverrides,
  UploadTokenFieldsOverrides
);

export type UploadTokenType = t.TypeOf<typeof UploadTokenCodec>;

const UploadToken = buildSchema(UploadTokenCodec, UploadTokenOverrides);

export default UploadToken;
