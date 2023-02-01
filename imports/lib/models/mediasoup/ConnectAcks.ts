import ConnectAck from '../../schemas/mediasoup/ConnectAck';
import type { ModelType } from '../Model';
import SoftDeletedModel from '../SoftDeletedModel';

const ConnectAcks = new SoftDeletedModel('jr_mediasoup_connect_acks', ConnectAck);
export type ConnectAckType = ModelType<typeof ConnectAcks>;

export default ConnectAcks;
