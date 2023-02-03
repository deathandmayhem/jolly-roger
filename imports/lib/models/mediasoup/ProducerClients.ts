import { z } from 'zod';
import type { ModelType } from '../Model';
import SoftDeletedModel from '../SoftDeletedModel';
import { foreignKey, nonEmptyString } from '../customTypes';
import withCommon from '../withCommon';

const ProducerClient = withCommon(z.object({
  createdServer: foreignKey,
  routedServer: foreignKey,
  call: foreignKey,
  peer: foreignKey,
  transport: foreignKey,
  transportRequest: foreignKey,
  // client-generated GUID for client to pair ProducerClient/ProducerServer with local track
  trackId: z.string().uuid(),
  kind: z.enum(['audio', 'video']),
  rtpParameters: nonEmptyString, // JSON-encoded
  paused: z.boolean(),
}));

const ProducerClients = new SoftDeletedModel('jr_mediasoup_producer_clients', ProducerClient);
export type ProducerClientType = ModelType<typeof ProducerClients>;

export default ProducerClients;
