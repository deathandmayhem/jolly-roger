import PendingAnnouncement from '../schemas/PendingAnnouncement';
import type { ModelType } from './Model';
import SoftDeletedModel from './SoftDeletedModel';

const PendingAnnouncements = new SoftDeletedModel('jr_pending_announcements', PendingAnnouncement);
export type PendingAnnouncementType = ModelType<typeof PendingAnnouncements>;

export default PendingAnnouncements;
