import SimpleSchema from 'simpl-schema';
import Base from './base.js';

const Tags = new SimpleSchema({
  name: {
    type: String,
  },

  hunt: {
    type: String,
    regEx: SimpleSchema.RegEx.Id,
  },
});
Tags.extend(Base);

export default Tags;
