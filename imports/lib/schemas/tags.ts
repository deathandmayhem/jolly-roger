import * as t from 'io-ts';
import SimpleSchema from 'simpl-schema';
import { Overrides, buildSchema, inheritSchema } from './typedSchemas';
import { BaseType, BaseOverrides } from './base';

const TagFields = t.type({
  name: t.string,
  hunt: t.string,
});

const TagFieldsOverrides: Overrides<t.TypeOf<typeof TagFields>> = {
  hunt: {
    regEx: SimpleSchema.RegEx.Id,
  },
};

const [TagType, TagOverrides] = inheritSchema(
  BaseType, TagFields,
  BaseOverrides, TagFieldsOverrides,
);
export { TagType };

const Tags = buildSchema(TagType, TagOverrides);

export default Tags;
