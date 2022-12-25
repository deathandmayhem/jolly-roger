import { Mongo } from 'meteor/mongo';
import RecentActivitySchema, { RecentActivityType } from '../schemas/RecentActivity';

const RecentActivities = new Mongo.Collection<RecentActivityType>('jr_recent_activities');
RecentActivities.attachSchema(RecentActivitySchema);

export default RecentActivities;
