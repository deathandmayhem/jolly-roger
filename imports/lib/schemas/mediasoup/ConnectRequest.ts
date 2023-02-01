import { z } from 'zod';
import { foreignKey, nonEmptyString } from '../customTypes';
import withCommon from '../withCommon';

const ConnectRequest = withCommon(z.object({
  createdServer: foreignKey,
  routedServer: foreignKey,
  call: foreignKey,
  peer: foreignKey,
  transportRequest: foreignKey,
  direction: z.enum(['send', 'recv']),
  transport: foreignKey,
  dtlsParameters: nonEmptyString, // JSON-encoded
}));

export default ConnectRequest;
