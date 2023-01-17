import { HuntType } from '../schemas/Hunt';
import Base from './Base';

const Hunts = new Base<HuntType>('hunts');

// All hunts are accessible, since they only contain metadata
Hunts.publish();

export default Hunts;
