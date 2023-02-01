import { DocumentActivity } from '../schemas/DocumentActivity';
import type { ModelType } from './Model';
import Model from './Model';

const DocumentActivities = new Model('jr_document_activities', DocumentActivity);
export type DocumentActivityType = ModelType<typeof DocumentActivities>;

export default DocumentActivities;
