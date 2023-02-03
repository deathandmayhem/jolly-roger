import { z } from 'zod';
import type { ModelType } from '../Model';
import SoftDeletedModel from '../SoftDeletedModel';
import { foreignKey } from '../customTypes';
import withCommon from '../withCommon';

const ProducerServer = withCommon(z.object({
  createdServer: foreignKey,
  call: foreignKey,
  peer: foreignKey,
  transport: foreignKey,
  producerClient: foreignKey,
  trackId: z.string().uuid(), // client-generated GUID
  producerId: z.string().uuid(),
}));

const ProducerServers = new SoftDeletedModel('jr_mediasoup_producer_servers', ProducerServer);
export type ProducerServerType = ModelType<typeof ProducerServers>;

export default ProducerServers;
