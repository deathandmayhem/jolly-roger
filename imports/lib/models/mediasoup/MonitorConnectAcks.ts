import { z } from "zod";
import type { ModelType } from "../Model";
import Model from "../Model";
import { foreignKey, nonEmptyString, portNumber } from "../customTypes";

const MonitorConnectAck = z.object({
  initiatingServer: foreignKey,
  receivingServer: foreignKey,
  transportId: z.uuid(),
  // we could theoretically write a regex to validate IP addresses, but doing so
  // and being v6-proof is a lot
  ip: nonEmptyString,
  port: portNumber,
  srtpParameters: nonEmptyString.optional() /* JSON-serialized if present */,
});

const MonitorConnectAcks = new Model(
  "jr_mediasoup_monitor_connect_acks",
  MonitorConnectAck,
);
export type MonitorConnectAckType = ModelType<typeof MonitorConnectAcks>;

export default MonitorConnectAcks;
