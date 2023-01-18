import type { ConnectAckType } from '../../schemas/mediasoup/ConnectAck';
import Base from '../Base';

const ConnectAcks = new Base<ConnectAckType>('mediasoup_connect_acks');

export default ConnectAcks;
