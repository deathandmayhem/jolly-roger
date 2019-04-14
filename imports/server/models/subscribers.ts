import { Mongo } from 'meteor/mongo';
import SubscribersSchema, { SubscriberType } from '../schemas/subscribers';

const Subscribers = new Mongo.Collection<SubscriberType>('jr_subscribers');
Subscribers.attachSchema(SubscribersSchema);

export default Subscribers;
