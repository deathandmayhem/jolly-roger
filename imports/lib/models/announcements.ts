import { huntsMatchingCurrentUser } from '../../model-helpers';
import AnnouncementSchema, { AnnouncementType } from '../schemas/announcement';
import Base from './base';

const Announcements = new Base<AnnouncementType>('announcements');
Announcements.attachSchema(AnnouncementSchema);
Announcements.publish(huntsMatchingCurrentUser);

export default Announcements;
