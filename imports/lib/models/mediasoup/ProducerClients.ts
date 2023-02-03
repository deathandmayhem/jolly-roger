import ProducerClient from '../../schemas/mediasoup/ProducerClient';
import type { ModelType } from '../Model';
import SoftDeletedModel from '../SoftDeletedModel';

const ProducerClients = new SoftDeletedModel('jr_mediasoup_producer_clients', ProducerClient);
export type ProducerClientType = ModelType<typeof ProducerClients>;

export default ProducerClients;
