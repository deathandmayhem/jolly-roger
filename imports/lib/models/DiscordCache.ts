import { z } from 'zod';
import type { ModelType } from './Model';
import Model from './Model';
import { nonEmptyString, snowflake } from './customTypes';
import withTimestamps from './withTimestamps';

export const DiscordCacheSchema = withTimestamps(z.object({
  snowflake,
  type: nonEmptyString,
  object: z.record(z.string(), z.unknown()),
}));

const DiscordCache = new Model('discord_cache', DiscordCacheSchema);
export type DiscordCacheType = ModelType<typeof DiscordCache>;

export default DiscordCache;
