import { z } from 'zod';
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

export default ConsumerAck;
