import { z } from "zod";
import {
  allowedEmptyString,
  foreignKey,
  nonEmptyString,
  portNumber,
} from "../customTypes";
import type { ModelType } from "../Model";
import Model from "../Model";

const MonitorConnectRequest = z.object({
  initiatingServer: foreignKey,
  receivingServer: foreignKey,
  transportId: z.string().uuid(),
  ip: nonEmptyString,
  port: portNumber,
  srtpParameters: nonEmptyString.optional() /* JSON-serialized if present */,
  producerId: z.string().uuid(),
  producerSctpStreamParameters:
    nonEmptyString.optional() /* JSON-serialized if present */,
  producerLabel: nonEmptyString.optional(),
  producerProtocol: allowedEmptyString.optional(),
});

const MonitorConnectRequests = new Model(
  "jr_mediasoup_monitor_connect_requests",
  MonitorConnectRequest,
);
export type MonitorConnectRequestType = ModelType<
  typeof MonitorConnectRequests
>;

export default MonitorConnectRequests;
