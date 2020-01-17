import { huntsMatchingCurrentUser } from '../../model-helpers';
import ActiveOperatorRole from '../active-operator-role';
import PuzzlesSchema, { PuzzleType } from '../schemas/puzzles';
import Base from './base';

const Puzzles = new Base<PuzzleType>('puzzles', {
  transform(doc: PuzzleType): PuzzleType {
    return { ...doc, tags: [...new Set(doc.tags)] };
  },
});
Puzzles.attachSchema(PuzzlesSchema);
Puzzles.publish(huntsMatchingCurrentUser);

ActiveOperatorRole.allow('mongo.puzzles.insert', () => true);
ActiveOperatorRole.allow('mongo.puzzles.update', () => true);

export default Puzzles;
