import { Mongo } from 'meteor/mongo';
import DriveChangesPageTokenSchema, { DriveChangesPageTokenType } from '../schemas/DriveChangesPageToken';

const DriveChangesPageTokens = new Mongo.Collection<DriveChangesPageTokenType>('jr_drive_changes_page_tokens');
DriveChangesPageTokens.attachSchema(DriveChangesPageTokenSchema);

export default DriveChangesPageTokens;
