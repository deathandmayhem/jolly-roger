import { z } from 'zod';
import { foreignKey, nonEmptyString } from '../customTypes';
import withCommon from '../withCommon';

const Transport = withCommon(z.object({
  createdServer: foreignKey,
  call: foreignKey,
  peer: foreignKey,
  transportRequest: foreignKey,
  // We adopt the mediasoup client library definition - "send" is
  // client-to-server (i.e. producers); "recv" is server to client (i.e.
  // consumers)
  direction: z.enum(['send', 'recv']),
  transportId: z.string().uuid(), // mediasoup identifier
  iceParameters: nonEmptyString, // JSON-encoded
  iceCandidates: nonEmptyString, // JSON-encoded
  dtlsParameters: nonEmptyString, // JSON-encoded
}));

export default Transport;
