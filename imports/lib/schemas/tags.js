import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import Base from './base.js';

const Tags = new SimpleSchema([
  Base,
  {
    name: {
      type: String,
    },

    hunt: {
      type: String,
      regEx: SimpleSchema.RegEx.Id,
    },
  },
]);

export default Tags;
