import type { HuntId } from '../models/Hunts';
import TypedPublication from './TypedPublication';

export default new TypedPublication<{ huntId: HuntId }>(
  'ChatMessages.publications.forFirehose'
);
