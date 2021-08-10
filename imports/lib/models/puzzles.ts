import { huntsMatchingCurrentUser } from '../../model-helpers';
import PuzzlesSchema, { PuzzleType } from '../schemas/puzzles';
import Base from './base';

const Puzzles = new Base<PuzzleType>('puzzles', {
  transform(doc: PuzzleType): PuzzleType {
    return { ...doc, tags: [...new Set(doc.tags)] };
  },
});
Puzzles.attachSchema(PuzzlesSchema);
Puzzles.publish(huntsMatchingCurrentUser);

export default Puzzles;
