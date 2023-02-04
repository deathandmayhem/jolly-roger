import type { HuntId } from '../lib/models/Hunts';
import TypedMethod from './TypedMethod';

export default new TypedMethod<{ huntId: HuntId }, void>(
  'Hunts.methods.destroy'
);
