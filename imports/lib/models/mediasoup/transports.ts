import TransportSchema, { TransportType } from '../../schemas/mediasoup/transport';
import Base from '../base';

const Transports = new Base<TransportType>('mediasoup_transports');
Transports.attachSchema(TransportSchema);

export default Transports;
