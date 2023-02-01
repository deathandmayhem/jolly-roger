import ProducerServer from '../../schemas/mediasoup/ProducerServer';
import type { ModelType } from '../Model';
import SoftDeletedModel from '../SoftDeletedModel';

const ProducerServers = new SoftDeletedModel('jr_mediasoup_producer_servers', ProducerServer);
export type ProducerServerType = ModelType<typeof ProducerServers>;

export default ProducerServers;
