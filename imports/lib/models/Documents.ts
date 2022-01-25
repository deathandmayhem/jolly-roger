import { huntsMatchingCurrentUser } from '../../model-helpers';
import DocumentSchema, { DocumentType } from '../schemas/Document';
import Base from './Base';

const Documents = new Base<DocumentType>('documents');
Documents.attachSchema(DocumentSchema);
Documents.publish(huntsMatchingCurrentUser);

export default Documents;
