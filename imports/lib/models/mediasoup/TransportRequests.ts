import type { TransportRequestType } from '../../schemas/mediasoup/TransportRequest';
import Base from '../Base';

const TransportRequests = new Base<TransportRequestType>('mediasoup_transport_requests');

export default TransportRequests;
