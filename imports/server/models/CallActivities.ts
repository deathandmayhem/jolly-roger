import { Mongo } from 'meteor/mongo';
import CallActivitySchema, { CallActivityType } from '../schemas/CallActivity';

const CallActivities = new Mongo.Collection<CallActivityType>('jr_call_activities');
CallActivities.attachSchema(CallActivitySchema);

export default CallActivities;
