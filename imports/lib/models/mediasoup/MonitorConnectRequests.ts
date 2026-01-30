import { z } from "zod";
import {
  allowedEmptyString,
  foreignKey,
  nonEmptyString,
  portNumber,
} from "../../typedModel/customTypes";
import type { ModelType } from "../../typedModel/Model";
import Model from "../../typedModel/Model";

const MonitorConnectRequest = z.object({
  initiatingServer: foreignKey,
  receivingServer: foreignKey,
  transportId: z.uuid(),
  ip: nonEmptyString,
  port: portNumber,
  srtpParameters: nonEmptyString.optional() /* JSON-serialized if present */,
  producerId: z.uuid(),
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
