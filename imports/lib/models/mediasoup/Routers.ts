import { z } from "zod";
import { foreignKey, nonEmptyString } from "../../typedModel/customTypes";
import type { ModelType } from "../../typedModel/Model";
import SoftDeletedModel from "../../typedModel/SoftDeletedModel";
import withCommon from "../../typedModel/withCommon";

const Router = withCommon(
  z.object({
    hunt: foreignKey,
    call: foreignKey,
    createdServer: foreignKey,
    routerId: z.uuid(), // mediasoup identifier
    rtpCapabilities: nonEmptyString, // JSON-encoded
  }),
);

const Routers = new SoftDeletedModel("jr_mediasoup_routers", Router);
Routers.addIndex({ call: 1 }, { unique: true });
Routers.addIndex({ routerId: 1 });
Routers.addIndex({ createdServer: 1 });
Routers.addIndex({ hunt: 1 });
export type RouterType = ModelType<typeof Routers>;

export default Routers;
