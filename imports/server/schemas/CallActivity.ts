import { z } from 'zod';
import { foreignKey } from '../../lib/schemas/customTypes';

const CallActivity = z.object({
  ts: z.date(),
  hunt: foreignKey,
  call: foreignKey,
  user: foreignKey,
});

export default CallActivity;
