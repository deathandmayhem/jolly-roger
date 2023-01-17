import * as t from 'io-ts';
import { BaseCodec, BaseOverrides } from './Base';
import { Id } from './regexes';
import type { Overrides } from './typedSchemas';
import { buildSchema, inheritSchema } from './typedSchemas';

const TagFields = t.type({
  name: t.string,
  hunt: t.string,
});

const TagFieldsOverrides: Overrides<t.TypeOf<typeof TagFields>> = {
  hunt: {
    regEx: Id,
  },
};

const [TagCodec, TagOverrides] = inheritSchema(
  BaseCodec,
  TagFields,
  BaseOverrides,
  TagFieldsOverrides,
);
export { TagCodec };
export type TagType = t.TypeOf<typeof TagCodec>;

const Tag = buildSchema(TagCodec, TagOverrides);

export default Tag;
