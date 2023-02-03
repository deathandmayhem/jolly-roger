import { z } from 'zod';
import { foreignKey, nonEmptyString } from '../../lib/schemas/customTypes';
import { Id } from '../../lib/schemas/regexes';
import withTimestamps from '../../lib/schemas/withTimestamps';

export const Subscriber = withTimestamps(z.object({
  server: foreignKey,
  // The connection ID is not technically a foreign key because it doesn't refer
  // to another database record
  connection: z.string().regex(Id),
  user: foreignKey,
  name: nonEmptyString,
  context: z.record(z.string(), nonEmptyString),
}));

export default Subscriber;
