import { z } from 'zod';
import { lastWriteTimestamp, nonEmptyString } from './customTypes';

const Server = z.object({
  hostname: nonEmptyString,
  pid: z.number().int(),
  updatedAt: lastWriteTimestamp,
});

export default Server;
