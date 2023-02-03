import ConnectRequest from '../../schemas/mediasoup/ConnectRequest';
import type { ModelType } from '../Model';
import SoftDeletedModel from '../SoftDeletedModel';

const ConnectRequests = new SoftDeletedModel('jr_mediasoup_connect_requests', ConnectRequest);
export type ConnectRequestType = ModelType<typeof ConnectRequests>;

export default ConnectRequests;
