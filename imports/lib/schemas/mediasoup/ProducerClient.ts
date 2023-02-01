import { z } from 'zod';
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

export default ProducerClient;
