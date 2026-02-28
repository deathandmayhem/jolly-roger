import { z } from "zod";
import { foreignKey, nonEmptyString } from "../../typedModel/customTypes";
import type { ModelType } from "../../typedModel/Model";
import SoftDeletedModel from "../../typedModel/SoftDeletedModel";
import withCommon from "../../typedModel/withCommon";

const Consumer = withCommon(
  z.object({
    createdServer: foreignKey,
    call: foreignKey,
    peer: foreignKey,
    transportRequest: foreignKey,
    transportId: z.uuid(),
    producerPeer: foreignKey,
    consumerId: z.uuid(),
    producerId: z.uuid(),
    kind: z.enum(["audio", "video"]),
    rtpParameters: nonEmptyString, // JSON-encoded
    paused: z.boolean(),
  }),
);

const Consumers = new SoftDeletedModel("jr_mediasoup_consumers", Consumer);
Consumers.addIndex({ peer: 1 });
Consumers.addIndex({ consumerId: 1 });
Consumers.addIndex({ createdServer: 1 });
export type ConsumerType = ModelType<typeof Consumers>;

export default Consumers;
