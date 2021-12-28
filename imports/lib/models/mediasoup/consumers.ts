import ConsumerSchema, { ConsumerType } from '../../schemas/mediasoup/consumer';
import Base from '../base';

const Consumers = new Base<ConsumerType>('mediasoup_consumers');
Consumers.attachSchema(ConsumerSchema);

export default Consumers;
