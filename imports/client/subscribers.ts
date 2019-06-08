// Pseudo-collection used by subscriber tracking
import { Mongo } from 'meteor/mongo';

export type SubscriberCounterType = {
  _id: string;
  value: number;
}

export type SubscriberType = {
  _id: string;
  // eslint-disable-next-line no-restricted-globals
  name: string;
  user: string;
}

export const SubscriberCounters = new Mongo.Collection<SubscriberCounterType>('subscribers.counts');
export const Subscribers = new Mongo.Collection<SubscriberType>('subscribers');
