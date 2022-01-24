import ConsumerSchema, { ConsumerType } from '../../schemas/mediasoup/Consumer';
import Base from '../Base';

const Consumers = new Base<ConsumerType>('mediasoup_consumers');
Consumers.attachSchema(ConsumerSchema);

export default Consumers;
