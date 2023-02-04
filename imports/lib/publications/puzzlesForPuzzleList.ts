import type { HuntId } from '../models/Hunts';
import TypedPublication from './TypedPublication';

export default new TypedPublication<{
  huntId: HuntId,
  includeDeleted?: boolean
}>(
  'Puzzles.publications.forPuzzleList'
);
