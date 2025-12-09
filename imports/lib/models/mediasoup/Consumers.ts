import { z } from "zod";
import { foreignKey, nonEmptyString } from "../customTypes";
import type { ModelType } from "../Model";
import SoftDeletedModel from "../SoftDeletedModel";
import withCommon from "../withCommon";

const Consumer = withCommon(
  z.object({
    createdServer: foreignKey,
    call: foreignKey,
    peer: foreignKey,
    transportRequest: foreignKey,
    transportId: z.string().uuid(),
    producerPeer: foreignKey,
    consumerId: z.string().uuid(),
    producerId: z.string().uuid(),
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
