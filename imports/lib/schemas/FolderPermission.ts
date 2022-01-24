import * as t from 'io-ts';
import SimpleSchema from 'simpl-schema';
import { BaseCodec, BaseOverrides } from './Base';
import { Overrides, buildSchema, inheritSchema } from './typedSchemas';

const FolderPermissionFields = t.type({
  folder: t.string,
  user: t.string,
  // This can change, so capture which one we gave permissions to
  googleAccount: t.string,
});

const FolderPermissionFieldsOverrides: Overrides<t.TypeOf<typeof FolderPermissionFields>> = {
  user: {
    regEx: SimpleSchema.RegEx.Id,
  },
  googleAccount: {
    regEx: SimpleSchema.RegEx.Email,
  },
};

const [FolderPermissionCodec, FolderPermissionOverrides] = inheritSchema(
  BaseCodec,
  FolderPermissionFields,
  BaseOverrides,
  FolderPermissionFieldsOverrides,
);
export { FolderPermissionCodec };
export type FolderPermissionType = t.TypeOf<typeof FolderPermissionCodec>;

const FolderPermission = buildSchema(FolderPermissionCodec, FolderPermissionOverrides);

export default FolderPermission;
