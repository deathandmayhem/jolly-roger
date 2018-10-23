import { huntsMatchingCurrentUser } from '../../model-helpers.js';
import Base from './base.js';
import PuzzlesSchema from '../schemas/puzzles.js';

const Puzzles = new Base('puzzles');
Puzzles.attachSchema(PuzzlesSchema);
Puzzles.publish(huntsMatchingCurrentUser);

export default Puzzles;
