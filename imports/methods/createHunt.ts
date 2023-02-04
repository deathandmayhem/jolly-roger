import type { EditableHuntType, HuntId } from '../lib/models/Hunts';
import TypedMethod from './TypedMethod';

export default new TypedMethod<EditableHuntType, HuntId>(
  'Hunts.methods.create'
);
