import { huntsMatchingCurrentUser } from '../../model-helpers';
import Base from './base';
import TagsSchema, { TagType } from '../schemas/tags';

const Tags = new Base<TagType>('tags');
Tags.attachSchema(TagsSchema);
Tags.publish(huntsMatchingCurrentUser);

export default Tags;
