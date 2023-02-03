import TransportRequest from '../../schemas/mediasoup/TransportRequest';
import type { ModelType } from '../Model';
import SoftDeletedModel from '../SoftDeletedModel';

const TransportRequests = new SoftDeletedModel('jr_mediasoup_transport_requests', TransportRequest);
export type TransportRequestType = ModelType<typeof TransportRequests>;

export default TransportRequests;
