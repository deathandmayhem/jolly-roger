import { Mongo } from 'meteor/mongo';
import { DocumentActivityType } from '../schemas/DocumentActivity';

const DocumentActivities = new Mongo.Collection<DocumentActivityType>('jr_document_activities');

export default DocumentActivities;
