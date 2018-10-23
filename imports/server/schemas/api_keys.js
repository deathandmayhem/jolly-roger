import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import Base from '../../lib/schemas/base.js';

const APIKeys = new SimpleSchema([
  Base,
  {
    user: {
      type: String,
      regEx: SimpleSchema.RegEx.Id,
    },
    key: {
      type: String,
      regEx: /^[A-Za-z0-9]{32}$/,
    },
  },
]);

export default APIKeys;
