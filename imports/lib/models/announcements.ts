import { huntsMatchingCurrentUser } from '../../model-helpers';
import ActiveOperatorRole from '../active-operator-role';
import AnnouncementsSchema, { AnnouncementType } from '../schemas/announcements';
import Base from './base';

const Announcements = new Base<AnnouncementType>('announcements');
Announcements.attachSchema(AnnouncementsSchema);
Announcements.publish(huntsMatchingCurrentUser);
ActiveOperatorRole.allow('mongo.announcements.insert', () => true);

export default Announcements;
