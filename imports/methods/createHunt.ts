import type { EditableHuntType } from '../lib/schemas/Hunt';
import TypedMethod from './TypedMethod';

export default new TypedMethod<EditableHuntType, string>(
  'Hunts.methods.create'
);
