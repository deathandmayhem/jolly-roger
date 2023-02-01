import DiscordCacheSchema from '../schemas/DiscordCache';
import type { ModelType } from './Model';
import Model from './Model';

const DiscordCache = new Model('discord_cache', DiscordCacheSchema);
export type DiscordCacheType = ModelType<typeof DiscordCache>;

export default DiscordCache;
