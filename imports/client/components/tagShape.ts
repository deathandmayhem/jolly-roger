import TagsSchema, { TagType } from '../../lib/schemas/tags';

const tagShape = TagsSchema.asReactPropTypes<TagType>();

export default tagShape;
