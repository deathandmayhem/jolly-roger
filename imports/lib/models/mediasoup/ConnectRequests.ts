import ConnectRequestSchema, { ConnectRequestType } from '../../schemas/mediasoup/ConnectRequest';
import Base from '../Base';

const ConnectRequests = new Base<ConnectRequestType>('mediasoup_connect_requests');
ConnectRequests.attachSchema(ConnectRequestSchema);

export default ConnectRequests;
