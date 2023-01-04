import { Mongo } from 'meteor/mongo';
import DriveActivityLatestSchema, { DriveActivityLatestType } from '../schemas/DriveActivityLatest';

const DriveActivityLatests = new Mongo.Collection<DriveActivityLatestType>('jr_drive_activity_latests');
DriveActivityLatests.attachSchema(DriveActivityLatestSchema);

export default DriveActivityLatests;
