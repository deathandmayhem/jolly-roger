import * as t from 'io-ts';
import type { Overrides } from '../../lib/schemas/typedSchemas';
import { buildSchema } from '../../lib/schemas/typedSchemas';

export const HuntFolderCodec = t.type({
  // Hunt ID
  _id: t.string,
  folder: t.string,
});

export type HuntFolderType = t.TypeOf<typeof HuntFolderCodec>;

const HuntFolderOverrides: Overrides<HuntFolderType> = {};

const HuntFolder = buildSchema(HuntFolderCodec, HuntFolderOverrides);

export default HuntFolder;
