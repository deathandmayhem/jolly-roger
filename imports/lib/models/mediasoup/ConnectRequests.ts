import { z } from 'zod';
import type { ModelType } from '../Model';
import SoftDeletedModel from '../SoftDeletedModel';
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

const ConnectRequests = new SoftDeletedModel('jr_mediasoup_connect_requests', ConnectRequest);
export type ConnectRequestType = ModelType<typeof ConnectRequests>;

export default ConnectRequests;
