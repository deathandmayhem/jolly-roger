// Pseudo-collection used by subscriber tracking
import { Mongo } from 'meteor/mongo';

const SubscriberCounters = new Mongo.Collection('subscribers.counts');
const Subscribers = new Mongo.Collection('subscribers');

export { Subscribers, SubscriberCounters };
