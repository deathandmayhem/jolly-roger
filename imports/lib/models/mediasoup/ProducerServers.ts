import { z } from "zod";
import { foreignKey, nonEmptyString } from "../customTypes";
import type { ModelType } from "../Model";
import SoftDeletedModel from "../SoftDeletedModel";
import withCommon from "../withCommon";

const ProducerServer = withCommon(
  z.object({
    createdServer: foreignKey,
    call: foreignKey,
    peer: foreignKey,
    transport: foreignKey,
    producerClient: foreignKey,
    trackId: nonEmptyString, // client-generated GUID
    producerId: z.string().uuid(),
  }),
);

const ProducerServers = new SoftDeletedModel(
  "jr_mediasoup_producer_servers",
  ProducerServer,
);
ProducerServers.addIndex({ producerClient: 1 }, { unique: true });
ProducerServers.addIndex({ transport: 1 });
ProducerServers.addIndex({ createdServer: 1 });
ProducerServers.addIndex({ producerId: 1 });
export type ProducerServerType = ModelType<typeof ProducerServers>;

export default ProducerServers;
