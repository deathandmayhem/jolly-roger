import { huntsMatchingCurrentUser } from '../../model-helpers';
import DocumentsSchema from '../schemas/documents';
import Base from './base';

const Documents = new Base('documents');
Documents.attachSchema(DocumentsSchema);
Documents.publish(huntsMatchingCurrentUser);

export default Documents;
