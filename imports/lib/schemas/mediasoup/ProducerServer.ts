import { z } from 'zod';
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

export default ProducerServer;
