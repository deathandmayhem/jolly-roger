import Consumer from '../../schemas/mediasoup/Consumer';
import type { ModelType } from '../Model';
import SoftDeletedModel from '../SoftDeletedModel';

const Consumers = new SoftDeletedModel('jr_mediasoup_consumers', Consumer);
export type ConsumerType = ModelType<typeof Consumers>;

export default Consumers;
