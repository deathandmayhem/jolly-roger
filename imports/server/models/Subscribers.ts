import { Mongo } from 'meteor/mongo';
import { SubscriberType } from '../schemas/Subscriber';

const Subscribers = new Mongo.Collection<SubscriberType>('jr_subscribers');

export default Subscribers;
