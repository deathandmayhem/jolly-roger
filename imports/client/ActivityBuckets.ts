import { Mongo } from 'meteor/mongo';
import { ACTIVITY_COLLECTION, PublishedBucket } from '../lib/config/activityTracking';

export default new Mongo.Collection<PublishedBucket>(ACTIVITY_COLLECTION);
