import TransportState from '../../schemas/mediasoup/TransportState';
import type { ModelType } from '../Model';
import SoftDeletedModel from '../SoftDeletedModel';

const TransportStates = new SoftDeletedModel('jr_mediasoup_transport_states', TransportState);
export type TransportStateType = ModelType<typeof TransportStates>;

export default TransportStates;
