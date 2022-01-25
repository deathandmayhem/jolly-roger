import { huntsMatchingCurrentUser } from '../../model-helpers';
import TagSchema, { TagType } from '../schemas/Tag';
import Base from './Base';

const Tags = new Base<TagType>('tags');
Tags.attachSchema(TagSchema);
Tags.publish(huntsMatchingCurrentUser);

export default Tags;
