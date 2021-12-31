import ConnectAckSchema, { ConnectAckType } from '../../schemas/mediasoup/connect_ack';
import Base from '../base';

const ConnectAcks = new Base<ConnectAckType>('mediasoup_connect_acks');
ConnectAcks.attachSchema(ConnectAckSchema);

export default ConnectAcks;
