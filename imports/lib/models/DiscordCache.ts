import { z } from "zod";
import { nonEmptyString, snowflake } from "../typedModel/customTypes";
import type { ModelType } from "../typedModel/Model";
import Model from "../typedModel/Model";
import withTimestamps from "../typedModel/withTimestamps";

export const DiscordCacheSchema = withTimestamps(
  z.object({
    snowflake,
    type: nonEmptyString,
    object: z.record(z.string(), z.unknown()),
  }),
);

const DiscordCache = new Model("discord_cache", DiscordCacheSchema);
DiscordCache.addIndex({ type: 1, snowflake: 1 }, { unique: true });
export type DiscordCacheType = ModelType<typeof DiscordCache>;

export default DiscordCache;
