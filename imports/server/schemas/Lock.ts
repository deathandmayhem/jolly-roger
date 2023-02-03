import { z } from 'zod';
import { createdTimestamp, nonEmptyString } from '../../lib/schemas/customTypes';

export const Lock = z.object({
  name: nonEmptyString,
  // Both of these are initially populated as created timestamps, but renewing
  // the lock will update renewedAt (but not createdAt)
  createdAt: createdTimestamp,
  renewedAt: createdTimestamp,
});

export default Lock;
