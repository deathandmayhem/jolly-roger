import type { TagType } from '../schemas/Tag';
import Base from './Base';

const Tags = new Base<TagType>('tags');

export default Tags;
