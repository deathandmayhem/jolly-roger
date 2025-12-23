import { z } from "zod";
import { foreignKey, nonEmptyString } from "./customTypes";
import type { ModelType } from "./Model";
import Model from "./Model";

const Server = z.object({
  hostname: nonEmptyString,
  pid: z.number().int(),
  // updatedAt is *not* set automatically, because we don't want to update it
  // when other servers are performing garbage collection
  updatedAt: z.date(),
  cleanupInProgressBy: foreignKey.optional(),
});

const Servers = new Model("jr_servers", Server);
Servers.addIndex({ updatedAt: 1 });
export type ServerType = ModelType<typeof Servers>;

export default Servers;
