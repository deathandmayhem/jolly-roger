import { z } from 'zod';
import { foreignKey } from '../customTypes';
import withCommon from '../withCommon';

// Room tracks the server assignment for a room. Its presence triggers the
// mediasoup integration to create a router.

const Room = withCommon(z.object({
  hunt: foreignKey,
  call: foreignKey,
  routedServer: foreignKey,
}));

export default Room;
