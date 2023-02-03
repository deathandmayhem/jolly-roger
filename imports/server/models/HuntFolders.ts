import type { ModelType } from '../../lib/models/Model';
import Model from '../../lib/models/Model';
import HuntFolder from '../schemas/HuntFolder';

const HuntFolders = new Model('jr_hunt_folders', HuntFolder);
export type HuntFolderType = ModelType<typeof HuntFolders>;

export default HuntFolders;
