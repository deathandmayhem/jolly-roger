import { z } from 'zod';
import { foreignKey, nonEmptyString } from '../customTypes';
import withCommon from '../withCommon';

const Router = withCommon(z.object({
  hunt: foreignKey,
  call: foreignKey,
  createdServer: foreignKey,
  routerId: z.string().uuid(), // mediasoup identifier
  rtpCapabilities: nonEmptyString, // JSON-encoded
}));

export default Router;
