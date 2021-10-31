import { Subscription } from 'meteor/meteor';
import DocumentPermissionSchema, { DocumentPermissionType } from '../schemas/document_permission';
import Base from './base';

const DocumentPermissions = new Base<DocumentPermissionType>('document_perms');
DocumentPermissions.attachSchema(DocumentPermissionSchema);
DocumentPermissions.publish(function (this: Subscription, q) {
  return { ...q, user: this.userId };
});

export default DocumentPermissions;
