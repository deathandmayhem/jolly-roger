import { z } from "zod";
import { nonEmptyString, snowflake } from "./customTypes";
import type { ModelType } from "./Model";
import Model from "./Model";
import withTimestamps from "./withTimestamps";

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
