import { _ } from 'meteor/underscore';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';

Schemas.DocumentPermissions = new SimpleSchema([
  Schemas.Base,
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

Models.DocumentPermissions = new Models.Base('document_perms');
Models.DocumentPermissions.attachSchema(Schemas.DocumentPermissions);
Models.DocumentPermissions.publish(function (q) {
  return _.extend({}, q, { user: this.userId });
});
