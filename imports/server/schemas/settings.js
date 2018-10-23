import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import Base from '../../lib/schemas/base.js';

const Settings = new SimpleSchema([
  Base,
  {
    name: {
      type: String,
    },
    value: {
      type: Object,
      blackbox: true,
    },
  },
]);

export default Settings;
