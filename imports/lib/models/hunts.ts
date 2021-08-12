import HuntsSchema, { HuntType } from '../schemas/hunts';
import Base from './base';

const Hunts = new Base<HuntType>('hunts');
Hunts.attachSchema(HuntsSchema);

// All hunts are accessible, since they only contain metadata
Hunts.publish();

export default Hunts;
