import { huntsMatchingCurrentUser } from '../../model-helpers';
import AnnouncementSchema, { AnnouncementType } from '../schemas/Announcement';
import Base from './Base';

const Announcements = new Base<AnnouncementType>('announcements');
Announcements.attachSchema(AnnouncementSchema);
Announcements.publish(huntsMatchingCurrentUser);

export default Announcements;
