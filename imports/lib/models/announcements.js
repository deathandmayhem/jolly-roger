import { huntsMatchingCurrentUser } from '../../model-helpers';
import AnnouncementsSchema from '../schemas/announcements';
import Base from './base';
import ActiveOperatorRole from '../active-operator-role';

const Announcements = new Base('announcements');
Announcements.attachSchema(AnnouncementsSchema);
Announcements.publish(huntsMatchingCurrentUser);
ActiveOperatorRole.allow('mongo.announcements.insert', () => true);

export default Announcements;
