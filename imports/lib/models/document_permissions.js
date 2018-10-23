import { _ } from 'meteor/underscore';
import DocumentPermissionsSchema from '../schemas/document_permissions.js';
import Base from './base.js';

const DocumentPermissions = new Base('document_perms');
DocumentPermissions.attachSchema(DocumentPermissionsSchema);
DocumentPermissions.publish(function (q) {
  return _.extend({}, q, { user: this.userId });
});

export default DocumentPermissions;
