import { z } from "zod";
import { foreignKey } from "../customTypes";
import type { ModelType } from "../Model";
import { Id } from "../regexes";
import SoftDeletedModel from "../SoftDeletedModel";
import withCommon from "../withCommon";

// Peer tracks room membership. When the first peer for a call is created,
// create a corresponding Room on the same server.
const Peer = withCommon(
  z.object({
    createdServer: foreignKey,
    hunt: foreignKey,
    call: foreignKey,
    // Tab ID doesn't refer to a database record, so it's technically not a foreign key
    tab: z.string().regex(Id),
    initialPeerState: z.enum(["active", "muted", "deafened"]),
    remoteMutedBy: foreignKey.optional(),
    muted: z.boolean(),
    deafened: z.boolean(),
  }),
);

const Peers = new SoftDeletedModel("jr_mediasoup_peers", Peer);
Peers.addIndex({ hunt: 1, call: 1, tab: 1 }, { unique: true });
Peers.addIndex({ call: 1, createdAt: 1 });
Peers.addIndex({ createdServer: 1 });
export type PeerType = ModelType<typeof Peers>;

export default Peers;
