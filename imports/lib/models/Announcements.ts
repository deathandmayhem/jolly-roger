import type { AnnouncementType } from '../schemas/Announcement';
import Base from './Base';

const Announcements = new Base<AnnouncementType>('announcements');

export default Announcements;
