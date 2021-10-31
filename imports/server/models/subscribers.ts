import { Mongo } from 'meteor/mongo';
import SubscriberSchema, { SubscriberType } from '../schemas/subscriber';

const Subscribers = new Mongo.Collection<SubscriberType>('jr_subscribers');
Subscribers.attachSchema(SubscriberSchema);

export default Subscribers;
