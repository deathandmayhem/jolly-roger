import { z } from "zod";
import { foreignKey } from "../customTypes";
import type { ModelType } from "../Model";
import SoftDeletedModel from "../SoftDeletedModel";
import withCommon from "../withCommon";

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
