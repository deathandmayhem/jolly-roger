import TransportStateSchema, { TransportStateType } from '../../schemas/mediasoup/transport_state';
import Base from '../base';

const TransportStates = new Base<TransportStateType>('mediasoup_transport_states');
TransportStates.attachSchema(TransportStateSchema);

export default TransportStates;
