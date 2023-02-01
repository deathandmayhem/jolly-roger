import Tag from '../schemas/Tag';
import type { ModelType } from './Model';
import SoftDeletedModel from './SoftDeletedModel';

const Tags = new SoftDeletedModel('jr_tags', Tag);
export type TagType = ModelType<typeof Tags>;

export default Tags;
