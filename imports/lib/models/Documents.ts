import Document from '../schemas/Document';
import type { ModelType } from './Model';
import Model from './Model';

const Documents = new Model('jr_documents', Document);
export type DocumentType = ModelType<typeof Documents>;

export default Documents;
