import { huntsMatchingCurrentUser } from '../../model-helpers.js';
import DocumentsSchema from '../schemas/documents.js';
import Base from './base.js';

const Documents = new Base('documents');
Documents.attachSchema(DocumentsSchema);
Documents.publish(huntsMatchingCurrentUser);

export default Documents;
