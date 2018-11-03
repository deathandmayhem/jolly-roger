import { huntsMatchingCurrentUser } from '../../model-helpers.js';
import AnnouncementsSchema from '../schemas/announcements.js';
import Base from './base.js';
import ActiveOperatorRole from '../active-operator-role.js';

const Announcements = new Base('announcements');
Announcements.attachSchema(AnnouncementsSchema);
Announcements.publish(huntsMatchingCurrentUser);
ActiveOperatorRole.allow('mongo.announcements.insert', () => true);

export default Announcements;
