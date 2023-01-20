import { Mongo } from 'meteor/mongo';
import type { DiscordCacheType } from '../schemas/DiscordCache';

const DiscordCache = new Mongo.Collection<DiscordCacheType>('discord_cache');

export default DiscordCache;
