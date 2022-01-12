import { Mongo } from 'meteor/mongo';
import HuntFolderSchema, { HuntFolderType } from '../schemas/hunt_folder';

const HuntFolders = new Mongo.Collection<HuntFolderType>('jr_hunt_folders');
HuntFolders.attachSchema(HuntFolderSchema);

export default HuntFolders;
