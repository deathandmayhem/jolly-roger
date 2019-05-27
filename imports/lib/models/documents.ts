import { huntsMatchingCurrentUser } from '../../model-helpers';
import DocumentsSchema, { DocumentType } from '../schemas/documents';
import Base from './base';

const Documents = new Base<DocumentType>('documents');
Documents.attachSchema(DocumentsSchema);
Documents.publish(huntsMatchingCurrentUser);

export default Documents;
