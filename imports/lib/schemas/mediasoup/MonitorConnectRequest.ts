import { z } from 'zod';
import {
  allowedEmptyString, foreignKey, nonEmptyString, portNumber,
} from '../customTypes';

const MonitorConnectRequest = z.object({
  initiatingServer: foreignKey,
  receivingServer: foreignKey,
  transportId: z.string().uuid(),
  ip: nonEmptyString,
  port: portNumber,
  srtpParameters: nonEmptyString.optional(), /* JSON-serialized if present */
  producerId: z.string().uuid(),
  producerSctpStreamParameters: nonEmptyString.optional(), /* JSON-serialized if present */
  producerLabel: nonEmptyString.optional(),
  producerProtocol: allowedEmptyString.optional(),
});

export default MonitorConnectRequest;
