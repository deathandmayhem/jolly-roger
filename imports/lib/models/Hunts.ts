import Hunt from '../schemas/Hunt';
import type { ModelType } from './Model';
import SoftDeletedModel from './SoftDeletedModel';

const Hunts = new SoftDeletedModel('jr_hunts', Hunt);
export type HuntType = ModelType<typeof Hunts>;

export default Hunts;
