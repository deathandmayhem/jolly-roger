import ConsumerAck from '../../schemas/mediasoup/ConsumerAck';
import type { ModelType } from '../Model';
import SoftDeletedModel from '../SoftDeletedModel';

const ConsumerAcks = new SoftDeletedModel('jr_mediasoup_consumer_acks', ConsumerAck);
export type ConsumerAckType = ModelType<typeof ConsumerAcks>;

export default ConsumerAcks;
