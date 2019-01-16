import SimpleSchema from 'simpl-schema';
import Base from './base';

const DocumentPermissions = new SimpleSchema({
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
});
DocumentPermissions.extend(Base);

export default DocumentPermissions;
