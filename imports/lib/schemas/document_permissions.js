import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import Base from './base.js';

const DocumentPermissions = new SimpleSchema([
  Base,
  {
    document: {
      type: String,
      regEx: SimpleSchema.RegEx.Id,
    },
    user: {
      type: String,
      regEx: SimpleSchema.RegEx.Id,
    },
    // This can change, so capture which one we gave permissions to
    googleAccount: {
      type: String,
      regEx: SimpleSchema.RegEx.Email,
    },
  },
]);

export default DocumentPermissions;
