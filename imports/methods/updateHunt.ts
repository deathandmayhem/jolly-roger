import type { EditableHuntType, HuntId } from '../lib/models/Hunts';
import TypedMethod from './TypedMethod';

export default new TypedMethod<{
  huntId: HuntId,
  value: EditableHuntType,
}, void>(
  'Hunts.methods.update'
);
