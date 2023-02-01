import { z } from 'zod';
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

export default ConnectAck;
