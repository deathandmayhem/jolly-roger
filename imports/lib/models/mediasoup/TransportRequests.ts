import { z } from "zod";
import { foreignKey, nonEmptyString } from "../../typedModel/customTypes";
import type { ModelType } from "../../typedModel/Model";
import SoftDeletedModel from "../../typedModel/SoftDeletedModel";
import withCommon from "../../typedModel/withCommon";

const TransportRequest = withCommon(
  z.object({
    createdServer: foreignKey,
    routedServer: foreignKey,
    call: foreignKey,
    peer: foreignKey,
    rtpCapabilities: nonEmptyString, // JSON-encoded
  }),
);

const TransportRequests = new SoftDeletedModel(
  "jr_mediasoup_transport_requests",
  TransportRequest,
);
TransportRequests.addIndex({ createdServer: 1 });
TransportRequests.addIndex({ routedServer: 1 });
export type TransportRequestType = ModelType<typeof TransportRequests>;

export default TransportRequests;
