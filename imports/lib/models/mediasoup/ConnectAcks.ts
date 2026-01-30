import { z } from "zod";
import { foreignKey } from "../../typedModel/customTypes";
import type { ModelType } from "../../typedModel/Model";
import SoftDeletedModel from "../../typedModel/SoftDeletedModel";
import withCommon from "../../typedModel/withCommon";

const ConnectAck = withCommon(
  z.object({
    createdServer: foreignKey,
    call: foreignKey,
    peer: foreignKey,
    transportRequest: foreignKey,
    direction: z.enum(["send", "recv"]),
    transport: foreignKey,
  }),
);

const ConnectAcks = new SoftDeletedModel(
  "jr_mediasoup_connect_acks",
  ConnectAck,
);
ConnectAcks.addIndex({ transport: 1 }, { unique: true });
ConnectAcks.addIndex({ peer: 1 });
ConnectAcks.addIndex({ createdServer: 1 });
export type ConnectAckType = ModelType<typeof ConnectAcks>;

export default ConnectAcks;
