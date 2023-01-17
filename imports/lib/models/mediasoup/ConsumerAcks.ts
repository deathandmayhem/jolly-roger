import type { ConsumerAckType } from '../../schemas/mediasoup/ConsumerAck';
import Base from '../Base';

const ConsumerAcks = new Base<ConsumerAckType>('mediasoup_consumer_acks');

export default ConsumerAcks;
