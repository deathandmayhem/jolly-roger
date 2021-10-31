import HuntSchema, { HuntType } from '../schemas/hunt';
import Base from './base';

const Hunts = new Base<HuntType>('hunts');
Hunts.attachSchema(HuntSchema);

// All hunts are accessible, since they only contain metadata
Hunts.publish();

export default Hunts;
