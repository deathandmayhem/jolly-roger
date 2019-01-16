import { huntsMatchingCurrentUser } from '../../model-helpers';
import Base from './base';
import TagsSchema from '../schemas/tags';

const Tags = new Base('tags');
Tags.attachSchema(TagsSchema);
Tags.publish(huntsMatchingCurrentUser);

export default Tags;
