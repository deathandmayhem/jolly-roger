import type { EditableHuntType } from '../lib/models/Hunts';
import TypedMethod from './TypedMethod';

export default new TypedMethod<{ huntId: string, value: EditableHuntType }, void>(
  'Hunts.methods.update'
);
