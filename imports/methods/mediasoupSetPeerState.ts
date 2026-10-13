import z from "zod";
import TypedMethod from "./TypedMethod";

// The three participant states permitted by setMediasoupPeerState fan out to two
// boolean properties on the document:
//
//         | active | muted | deafened |
// --------+--------+-------+----------+
//    muted|  false |  true |   true   |
// --------+--------+-------+----------+
// deafened|  false | false |   true   |
// --------+--------+-------+----------+
export const ALLOWED_STATES = ["active", "muted", "deafened"] as const;

export default new TypedMethod(
  "Mediasoup.Peers.methods.setState",
  z.tuple([
    z.strictObject({
      peerId: z.string(),
      state: z.enum(ALLOWED_STATES),
    }),
  ]),
  z.void(),
);
