import { huntsMatchingCurrentUser } from '../../model-helpers';
import { TagType } from '../schemas/Tag';
import Base from './Base';

const Tags = new Base<TagType>('tags');
Tags.publish(huntsMatchingCurrentUser);

export default Tags;
