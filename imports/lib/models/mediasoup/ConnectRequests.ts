import type { ConnectRequestType } from '../../schemas/mediasoup/ConnectRequest';
import Base from '../Base';

const ConnectRequests = new Base<ConnectRequestType>('mediasoup_connect_requests');

export default ConnectRequests;
