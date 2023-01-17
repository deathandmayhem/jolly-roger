import type { BaseType } from '../lib/schemas/Base';
import type { HuntType } from '../lib/schemas/Hunt';
import TypedMethod from './TypedMethod';

export default new TypedMethod<Omit<HuntType, keyof BaseType>, string>(
  'Hunts.methods.create'
);
