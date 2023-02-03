import { z } from 'zod';
import type { ModelType } from './Model';
import SoftDeletedModel from './SoftDeletedModel';
import { foreignKey } from './customTypes';
import withCommon from './withCommon';

// Broadcast announcements that have not yet been viewed by a given
// user
const PendingAnnouncement = withCommon(z.object({
  hunt: foreignKey,
  announcement: foreignKey,
  user: foreignKey,
}));

const PendingAnnouncements = new SoftDeletedModel('jr_pending_announcements', PendingAnnouncement);
export type PendingAnnouncementType = ModelType<typeof PendingAnnouncements>;

export default PendingAnnouncements;
