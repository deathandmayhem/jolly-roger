import ProducerServerSchema, { ProducerServerType } from '../../schemas/mediasoup/ProducerServer';
import Base from '../Base';

const ProducerServers = new Base<ProducerServerType>('mediasoup_producer_servers');
ProducerServers.attachSchema(ProducerServerSchema);

export default ProducerServers;
