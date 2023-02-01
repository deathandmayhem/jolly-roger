import { z } from 'zod';
import { nonEmptyString, snowflake } from './customTypes';
import withTimestamps from './withTimestamps';

export const DiscordCache = withTimestamps(z.object({
  snowflake,
  type: nonEmptyString,
  object: z.record(z.string(), z.unknown()),
}));

export default DiscordCache;
