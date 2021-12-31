import TransportRequestSchema, { TransportRequestType } from '../../schemas/mediasoup/transport_request';
import Base from '../base';

const TransportRequests = new Base<TransportRequestType>('mediasoup_transport_requests');
TransportRequests.attachSchema(TransportRequestSchema);

export default TransportRequests;
