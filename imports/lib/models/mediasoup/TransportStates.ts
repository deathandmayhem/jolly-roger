import { z } from "zod";
import { foreignKey, nonEmptyString } from "../customTypes";
import type { ModelType } from "../Model";
import SoftDeletedModel from "../SoftDeletedModel";
import withCommon from "../withCommon";

// TransportState tracks the server-side state of a Transport object. None of
// this data is needed for the actual WebRTC connection, but is collected purely
// for debugging purposes
//
// We have to use the Mediasoup-generated transport ID as the unique key,
// because the Meteor ID isn't available until after the transport is created.

const TransportState = withCommon(
  z.object({
    createdServer: foreignKey,
    transportId: z.string().uuid(), // mediasoup identifier
    iceState: nonEmptyString.optional(),
    iceSelectedTuple: nonEmptyString.optional(), // JSON-encoded
    dtlsState: nonEmptyString.optional(),
  }),
);

const TransportStates = new SoftDeletedModel(
  "jr_mediasoup_transport_states",
  TransportState,
);
TransportStates.addIndex(
  { transportId: 1, createdServer: 1 },
  { unique: true },
);
TransportStates.addIndex({ transportId: 1 });
export type TransportStateType = ModelType<typeof TransportStates>;

export default TransportStates;
