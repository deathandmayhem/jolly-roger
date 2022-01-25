import ConsumerAckSchema, { ConsumerAckType } from '../../schemas/mediasoup/ConsumerAck';
import Base from '../Base';

const ConsumerAcks = new Base<ConsumerAckType>('mediasoup_consumer_acks');
ConsumerAcks.attachSchema(ConsumerAckSchema);

export default ConsumerAcks;
