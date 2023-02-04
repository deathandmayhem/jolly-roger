import type { GdriveMimeTypesType } from '../lib/GdriveMimeTypes';
import type { HuntId } from '../lib/models/Hunts';
import TypedMethod from './TypedMethod';

export default new TypedMethod<{
  huntId: HuntId,
  title: string,
  url?: string,
  tags: string[],
  expectedAnswerCount: number,
  docType: GdriveMimeTypesType,
}, string>(
  'Puzzles.methods.create'
);
