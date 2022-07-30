import { BaseType } from '../lib/schemas/Base';
import { HuntType } from '../lib/schemas/Hunt';
import TypedMethod from './TypedMethod';

export default new TypedMethod<Omit<HuntType, keyof BaseType>, string>(
  'Hunts.methods.create'
);
