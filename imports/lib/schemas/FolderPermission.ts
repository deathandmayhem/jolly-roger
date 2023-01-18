import * as t from 'io-ts';
import { BaseCodec, BaseOverrides } from './Base';
import { Email, Id } from './regexes';
import type { Overrides } from './typedSchemas';
import { buildSchema, inheritSchema } from './typedSchemas';

const FolderPermissionFields = t.type({
  folder: t.string,
  user: t.string,
  // This can change, so capture which one we gave permissions to
  googleAccount: t.string,
  permissionLevel: t.union([t.undefined, t.literal('reader'), t.literal('commenter')]),
});

const FolderPermissionFieldsOverrides: Overrides<t.TypeOf<typeof FolderPermissionFields>> = {
  user: {
    regEx: Id,
  },
  googleAccount: {
    regEx: Email,
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
