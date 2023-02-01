import type { EditableHuntType } from '../lib/schemas/Hunt';
import TypedMethod from './TypedMethod';

export default new TypedMethod<{ huntId: string, value: EditableHuntType }, void>(
  'Hunts.methods.update'
);
