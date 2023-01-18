import type { ProducerServerType } from '../../schemas/mediasoup/ProducerServer';
import Base from '../Base';

const ProducerServers = new Base<ProducerServerType>('mediasoup_producer_servers');

export default ProducerServers;
