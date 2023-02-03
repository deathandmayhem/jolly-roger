import { z } from 'zod';
import { foreignKey, nonEmptyString } from '../customTypes';
import withCommon from '../withCommon';

const TransportRequest = withCommon(z.object({
  createdServer: foreignKey,
  routedServer: foreignKey,
  call: foreignKey,
  peer: foreignKey,
  rtpCapabilities: nonEmptyString, // JSON-encoded
}));

export default TransportRequest;
