import { huntsMatchingCurrentUser } from '../../model-helpers';
import type { AnnouncementType } from '../schemas/Announcement';
import Base from './Base';

const Announcements = new Base<AnnouncementType>('announcements');
Announcements.publish(huntsMatchingCurrentUser);

export default Announcements;
