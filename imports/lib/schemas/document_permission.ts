import * as t from 'io-ts';
import SimpleSchema from 'simpl-schema';
import { BaseCodec, BaseOverrides } from './base';
import { Overrides, buildSchema, inheritSchema } from './typedSchemas';

const DocumentPermissionFields = t.type({
  document: t.string,
  user: t.string,
  // This can change, so capture which one we gave permissions to
  googleAccount: t.string,
});

const DocumentPermissionFieldsOverrides: Overrides<t.TypeOf<typeof DocumentPermissionFields>> = {
  document: {
    regEx: SimpleSchema.RegEx.Id,
  },
  user: {
    regEx: SimpleSchema.RegEx.Id,
  },
  googleAccount: {
    regEx: SimpleSchema.RegEx.Email,
  },
};

const [DocumentPermissionCodec, DocumentPermissionOverrides] = inheritSchema(
  BaseCodec,
  DocumentPermissionFields,
  BaseOverrides,
  DocumentPermissionFieldsOverrides,
);
export { DocumentPermissionCodec };
export type DocumentPermissionType = t.TypeOf<typeof DocumentPermissionCodec>;

const DocumentPermission = buildSchema(DocumentPermissionCodec, DocumentPermissionOverrides);

export default DocumentPermission;
