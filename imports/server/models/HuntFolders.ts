import { Mongo } from 'meteor/mongo';
import type { HuntFolderType } from '../schemas/HuntFolder';

const HuntFolders = new Mongo.Collection<HuntFolderType>('jr_hunt_folders');

export default HuntFolders;
