import DocumentPermissionSchema, { DocumentPermissionType } from '../schemas/document_permission';
import Base from './base';

const DocumentPermissions = new Base<DocumentPermissionType>('document_perms');
DocumentPermissions.attachSchema(DocumentPermissionSchema);
DocumentPermissions.publish((userId, q) => {
  return { ...q, user: userId };
});

export default DocumentPermissions;
