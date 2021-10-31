import { huntsMatchingCurrentUser } from '../../model-helpers';
import TagSchema, { TagType } from '../schemas/tag';
import Base from './base';

const Tags = new Base<TagType>('tags');
Tags.attachSchema(TagSchema);
Tags.publish(huntsMatchingCurrentUser);

export default Tags;
