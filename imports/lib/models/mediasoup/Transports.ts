import type { TransportType } from '../../schemas/mediasoup/Transport';
import Base from '../Base';

const Transports = new Base<TransportType>('mediasoup_transports');

export default Transports;
