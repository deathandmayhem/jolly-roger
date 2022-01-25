import TransportSchema, { TransportType } from '../../schemas/mediasoup/Transport';
import Base from '../Base';

const Transports = new Base<TransportType>('mediasoup_transports');
Transports.attachSchema(TransportSchema);

export default Transports;
