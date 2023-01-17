import { huntsMatchingCurrentUser } from '../../model-helpers';
import type { DocumentType } from '../schemas/Document';
import Base from './Base';

const Documents = new Base<DocumentType>('documents');
Documents.publish(huntsMatchingCurrentUser);

export default Documents;
