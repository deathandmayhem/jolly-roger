import { z } from 'zod';
import { foreignKey, nonEmptyString, portNumber } from '../customTypes';

const MonitorConnectAck = z.object({
  initiatingServer: foreignKey,
  receivingServer: foreignKey,
  transportId: z.string().uuid(),
  // we could theoretically write a regex to validate IP addresses, but doing so
  // and being v6-proof is a lot
  ip: nonEmptyString,
  port: portNumber,
  srtpParameters: nonEmptyString.optional(), /* JSON-serialized if present */
});

export default MonitorConnectAck;
