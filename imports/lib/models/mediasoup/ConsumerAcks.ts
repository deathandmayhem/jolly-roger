import { z } from "zod";
import { foreignKey } from "../customTypes";
import type { ModelType } from "../Model";
import SoftDeletedModel from "../SoftDeletedModel";
import withCommon from "../withCommon";

const ConsumerAck = withCommon(
  z.object({
    createdServer: foreignKey,
    routedServer: foreignKey,
    call: foreignKey,
    peer: foreignKey,
    transportRequest: foreignKey,
    consumer: foreignKey,
    producerId: z.string().uuid(),
  }),
);

const ConsumerAcks = new SoftDeletedModel(
  "jr_mediasoup_consumer_acks",
  ConsumerAck,
);
ConsumerAcks.addIndex({ consumer: 1 }, { unique: true });
ConsumerAcks.addIndex({ peer: 1 });
ConsumerAcks.addIndex({ createdServer: 1 });
export type ConsumerAckType = ModelType<typeof ConsumerAcks>;

export default ConsumerAcks;
