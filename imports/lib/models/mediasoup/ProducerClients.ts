import { z } from "zod";
import { foreignKey, nonEmptyString } from "../customTypes";
import type { ModelType } from "../Model";
import SoftDeletedModel from "../SoftDeletedModel";
import withCommon from "../withCommon";

const ProducerClient = withCommon(
  z.object({
    createdServer: foreignKey,
    routedServer: foreignKey,
    call: foreignKey,
    peer: foreignKey,
    transport: foreignKey,
    transportRequest: foreignKey,
    // client-generated GUID for client to pair ProducerClient/ProducerServer with local track
    trackId: nonEmptyString,
    kind: z.enum(["audio", "video"]),
    rtpParameters: nonEmptyString, // JSON-encoded
    paused: z.boolean(),
  }),
);

const ProducerClients = new SoftDeletedModel(
  "jr_mediasoup_producer_clients",
  ProducerClient,
);
ProducerClients.addIndex({ transport: 1 });
ProducerClients.addIndex({ createdServer: 1 });
ProducerClients.addIndex({ routedServer: 1 });
export type ProducerClientType = ModelType<typeof ProducerClients>;

export default ProducerClients;
