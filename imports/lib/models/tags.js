import { huntsMatchingCurrentUser } from '../../model-helpers.js';
import Base from './base.js';
import TagsSchema from '../schemas/tags.js';

const Tags = new Base('tags');
Tags.attachSchema(TagsSchema);
Tags.publish(huntsMatchingCurrentUser);

export default Tags;
