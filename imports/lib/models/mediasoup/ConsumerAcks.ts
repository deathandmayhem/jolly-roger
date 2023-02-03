import { z } from 'zod';
import type { ModelType } from '../Model';
import SoftDeletedModel from '../SoftDeletedModel';
import { foreignKey } from '../customTypes';
import withCommon from '../withCommon';

const ConsumerAck = withCommon(z.object({
  createdServer: foreignKey,
  routedServer: foreignKey,
  call: foreignKey,
  peer: foreignKey,
  transportRequest: foreignKey,
  consumer: foreignKey,
  producerId: z.string().uuid(),
}));

const ConsumerAcks = new SoftDeletedModel('jr_mediasoup_consumer_acks', ConsumerAck);
export type ConsumerAckType = ModelType<typeof ConsumerAcks>;

export default ConsumerAcks;
