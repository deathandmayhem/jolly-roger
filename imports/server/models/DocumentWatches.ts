import { Mongo } from 'meteor/mongo';
import DocumentWatch, { DocumentWatchType } from '../schemas/DocumentWatch';

const DocumentWatches = new Mongo.Collection<DocumentWatchType>('jr_document_watches');
DocumentWatches.attachSchema(DocumentWatch);

export default DocumentWatches;
