import 'meteor/meteor';
import DocumentPermissionsSchema, { DocumentPermissionType } from '../schemas/document_permissions';
import Base from './base';

const DocumentPermissions = new Base<DocumentPermissionType>('document_perms');
DocumentPermissions.attachSchema(DocumentPermissionsSchema);
DocumentPermissions.publish(function (this: Subscription, q) {
  return Object.assign({}, q, { user: this.userId });
});

export default DocumentPermissions;
