import { huntsMatchingCurrentUser } from '../../model-helpers';
import TagsSchema, { TagType } from '../schemas/tags';
import Base from './base';

const Tags = new Base<TagType>('tags');
Tags.attachSchema(TagsSchema);
Tags.publish(huntsMatchingCurrentUser);

export default Tags;
