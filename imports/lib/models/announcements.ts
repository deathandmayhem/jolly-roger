import { huntsMatchingCurrentUser } from '../../model-helpers';
import AnnouncementsSchema, { AnnouncementType } from '../schemas/announcements';
import Base from './base';

const Announcements = new Base<AnnouncementType>('announcements');
Announcements.attachSchema(AnnouncementsSchema);
Announcements.publish(huntsMatchingCurrentUser);

export default Announcements;
