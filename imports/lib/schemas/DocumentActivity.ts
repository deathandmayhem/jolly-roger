import { z } from 'zod';
import { foreignKey } from './customTypes';

/* DocumentActivityFields doesn't inherit from Base because it's created by the
   server, not by users */
export const DocumentActivity = z.object({
  ts: z.date(), /* rounded to ACTIVITY_GRANULARITY */
  hunt: foreignKey,
  puzzle: foreignKey,
  document: foreignKey,
  // user can be undefined if we aren't able to match an activity record back to
  // a Jolly Roger user (e.g. because they haven't linked their Google Account)
  user: foreignKey.optional(),
});

export default DocumentActivity;
