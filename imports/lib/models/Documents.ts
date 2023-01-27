import type { DocumentType } from '../schemas/Document';
import Base from './Base';

const Documents = new Base<DocumentType>('documents');

export default Documents;
