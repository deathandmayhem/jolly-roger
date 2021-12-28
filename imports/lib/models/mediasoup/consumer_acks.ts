import ConsumerAckSchema, { ConsumerAckType } from '../../schemas/mediasoup/consumer_ack';
import Base from '../base';

const ConsumerAcks = new Base<ConsumerAckType>('mediasoup_consumer_acks');
ConsumerAcks.attachSchema(ConsumerAckSchema);

export default ConsumerAcks;
