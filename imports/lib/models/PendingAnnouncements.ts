import type { PendingAnnouncementType } from '../schemas/PendingAnnouncement';
import Base from './Base';

const PendingAnnouncements = new Base<PendingAnnouncementType>('pending_announcements');

export default PendingAnnouncements;
