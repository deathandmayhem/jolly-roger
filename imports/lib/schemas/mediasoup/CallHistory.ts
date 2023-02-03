import { z } from 'zod';
import { foreignKey } from '../customTypes';

// Don't use the BaseCodec here - unlike most database objects, this isn't
// manipulated by users, so many of the fields don't make sense
const CallHistory = z.object({
  hunt: foreignKey,
  call: foreignKey,
  lastActivity: z.date(),
});

export default CallHistory;
