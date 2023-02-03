import Announcement from '../schemas/Announcement';
import type { ModelType } from './Model';
import SoftDeletedModel from './SoftDeletedModel';

const Announcements = new SoftDeletedModel('jr_announcements', Announcement);
export type AnnouncementType = ModelType<typeof Announcements>;

export default Announcements;
