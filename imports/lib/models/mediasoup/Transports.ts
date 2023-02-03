import Transport from '../../schemas/mediasoup/Transport';
import type { ModelType } from '../Model';
import SoftDeletedModel from '../SoftDeletedModel';

const Transports = new SoftDeletedModel('jr_mediasoup_transports', Transport);
export type TransportType = ModelType<typeof Transports>;

export default Transports;
