import * as t from 'io-ts';
import SimpleSchema from 'simpl-schema';
import { Overrides, buildSchema, inheritSchema } from './typedSchemas';
import { BaseType, BaseOverrides } from './base';

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

const [DocumentPermissionType, DocumentPermissionOverrides] = inheritSchema(
  BaseType, DocumentPermissionFields,
  BaseOverrides, DocumentPermissionFieldsOverrides,
);
export { DocumentPermissionType };

const DocumentPermissions = buildSchema(DocumentPermissionType, DocumentPermissionOverrides);

export default DocumentPermissions;
