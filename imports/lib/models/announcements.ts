import { huntsMatchingCurrentUser } from '../../model-helpers';
import AnnouncementsSchema, { AnnouncementType } from '../schemas/announcements';
import Base from './base';
import ActiveOperatorRole from '../active-operator-role';

const Announcements = new Base<AnnouncementType>('announcements');
Announcements.attachSchema(AnnouncementsSchema);
Announcements.publish(huntsMatchingCurrentUser);
ActiveOperatorRole.allow('mongo.announcements.insert', () => true);

export default Announcements;
