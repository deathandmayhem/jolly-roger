import { z } from 'zod';
import { foreignKey } from '../customTypes';
import { Id } from '../regexes';
import withCommon from '../withCommon';

// Peer tracks room membership. When the first peer for a call is created,
// create a corresponding Room on the same server.
const Peer = withCommon(z.object({
  createdServer: foreignKey,
  hunt: foreignKey,
  call: foreignKey,
  // Tab ID doesn't refer to a database record, so it's technically not a foreign key
  tab: z.string().regex(Id),
  initialPeerState: z.enum(['active', 'muted', 'deafened']),
  remoteMutedBy: foreignKey.optional(),
  muted: z.boolean(),
  deafened: z.boolean(),
}));

export default Peer;
