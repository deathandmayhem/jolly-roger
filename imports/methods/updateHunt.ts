import { BaseType } from '../lib/schemas/Base';
import { HuntType } from '../lib/schemas/Hunt';
import TypedMethod from './TypedMethod';

export default new TypedMethod<{ huntId: string, value: Omit<HuntType, keyof BaseType> }, void>(
  'Hunts.methods.update'
);
