import ProducerClientSchema, { ProducerClientType } from '../../schemas/mediasoup/producer_client';
import Base from '../base';

const ProducerClients = new Base<ProducerClientType>('mediasoup_producer_clients');
ProducerClients.attachSchema(ProducerClientSchema);

export default ProducerClients;
