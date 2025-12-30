import { z } from "zod";
import { foreignKey, nonEmptyString } from "../customTypes";
import type { ModelType } from "../Model";
import SoftDeletedModel from "../SoftDeletedModel";
import withCommon from "../withCommon";

const Router = withCommon(
  z.object({
    hunt: foreignKey,
    call: foreignKey,
    createdServer: foreignKey,
    routerId: z.string().uuid(), // mediasoup identifier
    rtpCapabilities: nonEmptyString, // JSON-encoded
  }),
);

const Routers = new SoftDeletedModel("jr_mediasoup_routers", Router);
Routers.addIndex({ call: 1 }, { unique: true });
Routers.addIndex({ routerId: 1 });
Routers.addIndex({ createdServer: 1 });
export type RouterType = ModelType<typeof Routers>;

export default Routers;
