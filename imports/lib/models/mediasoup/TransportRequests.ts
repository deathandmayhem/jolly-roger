import TransportRequestSchema, { TransportRequestType } from '../../schemas/mediasoup/TransportRequest';
import Base from '../Base';

const TransportRequests = new Base<TransportRequestType>('mediasoup_transport_requests');
TransportRequests.attachSchema(TransportRequestSchema);

export default TransportRequests;
