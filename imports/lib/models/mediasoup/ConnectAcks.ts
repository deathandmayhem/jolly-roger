import { z } from 'zod';
import type { ModelType } from '../Model';
import SoftDeletedModel from '../SoftDeletedModel';
import { foreignKey } from '../customTypes';
import withCommon from '../withCommon';

const ConnectAck = withCommon(z.object({
  createdServer: foreignKey,
  call: foreignKey,
  peer: foreignKey,
  transportRequest: foreignKey,
  direction: z.enum(['send', 'recv']),
  transport: foreignKey,
}));

const ConnectAcks = new SoftDeletedModel('jr_mediasoup_connect_acks', ConnectAck);
export type ConnectAckType = ModelType<typeof ConnectAcks>;

export default ConnectAcks;
