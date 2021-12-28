import ConnectRequestSchema, { ConnectRequestType } from '../../schemas/mediasoup/connect_request';
import Base from '../base';

const ConnectRequests = new Base<ConnectRequestType>('mediasoup_connect_requests');
ConnectRequests.attachSchema(ConnectRequestSchema);

export default ConnectRequests;
