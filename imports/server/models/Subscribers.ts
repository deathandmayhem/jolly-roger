import type { ModelType } from '../../lib/models/Model';
import Model from '../../lib/models/Model';
import Subscriber from '../schemas/Subscriber';

const Subscribers = new Model('jr_subscribers', Subscriber);
export type SubscriberType = ModelType<typeof Subscribers>;

export default Subscribers;
