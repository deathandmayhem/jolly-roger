import type { HuntType } from '../schemas/Hunt';
import Base from './Base';

const Hunts = new Base<HuntType>('hunts');

export default Hunts;
