// Pseudo-collection used by subscriber tracking
import { Mongo } from 'meteor/mongo';

const SubscriberCounters = new Mongo.Collection('subscribers.counts');

export { SubscriberCounters };
