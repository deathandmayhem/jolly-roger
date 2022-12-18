import { Mongo } from 'meteor/mongo';
import DocumentActivitiesSchema, { DocumentActivityType } from '../schemas/DocumentActivity';

const DocumentActivities = new Mongo.Collection<DocumentActivityType>('jr_document_activities');
DocumentActivities.attachSchema(DocumentActivitiesSchema);

export default DocumentActivities;
