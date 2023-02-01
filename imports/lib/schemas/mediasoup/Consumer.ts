import { z } from 'zod';
import { foreignKey, nonEmptyString } from '../customTypes';
import withCommon from '../withCommon';

const Consumer = withCommon(z.object({
  createdServer: foreignKey,
  call: foreignKey,
  peer: foreignKey,
  transportRequest: foreignKey,
  transportId: z.string().uuid(),
  producerPeer: foreignKey,
  consumerId: z.string().uuid(),
  producerId: z.string().uuid(),
  kind: z.enum(['audio', 'video']),
  rtpParameters: nonEmptyString, // JSON-encoded
  paused: z.boolean(),
}));

export default Consumer;
