import { z } from 'zod';
import { foreignKey } from './customTypes';
import withCommon from './withCommon';

// Broadcast announcements that have not yet been viewed by a given
// user
const PendingAnnouncement = withCommon(z.object({
  hunt: foreignKey,
  announcement: foreignKey,
  user: foreignKey,
}));

export default PendingAnnouncement;
