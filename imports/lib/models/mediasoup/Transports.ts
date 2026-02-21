import { z } from "zod";
import { foreignKey, nonEmptyString } from "../../typedModel/customTypes";
import type { ModelType } from "../../typedModel/Model";
import SoftDeletedModel from "../../typedModel/SoftDeletedModel";
import withCommon from "../../typedModel/withCommon";

const Transport = withCommon(
  z.object({
    createdServer: foreignKey,
    call: foreignKey,
    peer: foreignKey,
    transportRequest: foreignKey,
    // We adopt the mediasoup client library definition - "send" is
    // client-to-server (i.e. producers); "recv" is server to client (i.e.
    // consumers)
    direction: z.enum(["send", "recv"]),
    transportId: z.uuid(), // mediasoup identifier
    iceParameters: nonEmptyString, // JSON-encoded
    iceCandidates: nonEmptyString, // JSON-encoded
    dtlsParameters: nonEmptyString, // JSON-encoded
    turnConfig: z
      .object({
        urls: nonEmptyString,
        username: nonEmptyString,
        credential: nonEmptyString,
      })
      .optional(),
  }),
);

const Transports = new SoftDeletedModel("jr_mediasoup_transports", Transport);
Transports.addIndex({ transportRequest: 1, direction: 1 }, { unique: true });
Transports.addIndex({ transportId: 1 });
Transports.addIndex({ createdServer: 1 });
export type TransportType = ModelType<typeof Transports>;

export default Transports;
