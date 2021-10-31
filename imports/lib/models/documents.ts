import { huntsMatchingCurrentUser } from '../../model-helpers';
import DocumentSchema, { DocumentType } from '../schemas/document';
import Base from './base';

const Documents = new Base<DocumentType>('documents');
Documents.attachSchema(DocumentSchema);
Documents.publish(huntsMatchingCurrentUser);

export default Documents;
