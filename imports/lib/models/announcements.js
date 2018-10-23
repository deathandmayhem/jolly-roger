import { huntsMatchingCurrentUser } from '../../model-helpers.js';
import AnnouncementsSchema from '../schemas/announcements.js';
import Base from './base.js';

const Announcements = new Base('announcements');
Announcements.attachSchema(AnnouncementsSchema);
Announcements.publish(huntsMatchingCurrentUser);

export default Announcements;
