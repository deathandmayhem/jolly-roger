import { Mongo } from 'meteor/mongo';
import HuntFolderSchema, { HuntFolderType } from '../schemas/HuntFolder';

const HuntFolders = new Mongo.Collection<HuntFolderType>('jr_hunt_folders');
HuntFolders.attachSchema(HuntFolderSchema);

export default HuntFolders;
