import ProducerServerSchema, { ProducerServerType } from '../../schemas/mediasoup/producer_server';
import Base from '../base';

const ProducerServers = new Base<ProducerServerType>('mediasoup_producer_servers');
ProducerServers.attachSchema(ProducerServerSchema);

export default ProducerServers;
