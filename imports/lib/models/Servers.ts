import { z } from 'zod';
import type { ModelType } from './Model';
import Model from './Model';
import { lastWriteTimestamp, nonEmptyString } from './customTypes';

const Server = z.object({
  hostname: nonEmptyString,
  pid: z.number().int(),
  updatedAt: lastWriteTimestamp,
});

const Servers = new Model('jr_servers', Server);
export type ServerType = ModelType<typeof Servers>;

export default Servers;
