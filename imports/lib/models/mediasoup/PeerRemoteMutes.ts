import { z } from "zod";
import { foreignKey } from "../customTypes";
import type { ModelType } from "../Model";
import SoftDeletedModel from "../SoftDeletedModel";
import withCommon from "../withCommon";

// PeerRemoteMute is an audit log of when one user mutes another user. When a
// user is remote-muted, their Peer record is also updated, which tracks current
// state.
const PeerRemoteMute = withCommon(
  z.object({
    call: foreignKey,
    peer: foreignKey,
  }),
);

const PeerRemoteMutes = new SoftDeletedModel(
  "jr_mediasoup_peer_remote_mutes",
  PeerRemoteMute,
);
export type PeerRemoteMuteType = ModelType<typeof PeerRemoteMutes>;

export default PeerRemoteMutes;
