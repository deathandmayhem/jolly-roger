import { Mongo } from 'meteor/mongo';
import ConsolidatedActivitySchema, { ConsolidatedActivityType } from '../schemas/ConsolidatedActivity';

const ConsolidatedActivities = new Mongo.Collection<ConsolidatedActivityType>('jr_consolidated_activities');
ConsolidatedActivities.attachSchema(ConsolidatedActivitySchema);

export default ConsolidatedActivities;
