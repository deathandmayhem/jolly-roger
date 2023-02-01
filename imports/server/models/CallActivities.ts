import type { ModelType } from '../../lib/models/Model';
import Model from '../../lib/models/Model';
import CallActivity from '../schemas/CallActivity';

const CallActivities = new Model('jr_call_activities', CallActivity);
export type CallActivityType = ModelType<typeof CallActivities>;

export default CallActivities;
