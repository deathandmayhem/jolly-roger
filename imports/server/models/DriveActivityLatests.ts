import { Mongo } from 'meteor/mongo';
import type { DriveActivityLatestType } from '../schemas/DriveActivityLatest';

const DriveActivityLatests = new Mongo.Collection<DriveActivityLatestType>('jr_drive_activity_latests');

export default DriveActivityLatests;
