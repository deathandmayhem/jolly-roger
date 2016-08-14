// Pseudo-collection used by subCounter
import { Mongo } from 'meteor/mongo';

const SubscriberCounters = new Mongo.Collection('subCounter');

export { SubscriberCounters };
