import { Mongo } from 'meteor/mongo';
import type { CallActivityType } from '../schemas/CallActivity';

const CallActivities = new Mongo.Collection<CallActivityType>('jr_call_activities');

export default CallActivities;
