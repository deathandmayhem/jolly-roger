import { z } from 'zod';
import type { ModelType } from '../Model';
import SoftDeletedModel from '../SoftDeletedModel';
import { foreignKey, nonEmptyString } from '../customTypes';
import withCommon from '../withCommon';

const Router = withCommon(z.object({
  hunt: foreignKey,
  call: foreignKey,
  createdServer: foreignKey,
  routerId: z.string().uuid(), // mediasoup identifier
  rtpCapabilities: nonEmptyString, // JSON-encoded
}));

const Routers = new SoftDeletedModel('jr_mediasoup_routers', Router);
export type RouterType = ModelType<typeof Routers>;

export default Routers;
