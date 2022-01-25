import ProducerClientSchema, { ProducerClientType } from '../../schemas/mediasoup/ProducerClient';
import Base from '../Base';

const ProducerClients = new Base<ProducerClientType>('mediasoup_producer_clients');
ProducerClients.attachSchema(ProducerClientSchema);

export default ProducerClients;
