import { huntsMatchingCurrentUser } from '../../model-helpers';
import PuzzleSchema, { PuzzleType } from '../schemas/puzzle';
import Base from './base';

const Puzzles = new Base<PuzzleType>('puzzles', {
  transform(doc: PuzzleType): PuzzleType {
    return { ...doc, tags: [...new Set(doc.tags)] };
  },
});
Puzzles.attachSchema(PuzzleSchema);
Puzzles.publish(huntsMatchingCurrentUser);

export default Puzzles;
