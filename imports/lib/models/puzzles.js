import { huntsMatchingCurrentUser } from '../../model-helpers.js';
import Base from './base.js';
import PuzzlesSchema from '../schemas/puzzles.js';
import ActiveOperatorRole from '../active-operator-role.js';

const Puzzles = new Base('puzzles');
Puzzles.attachSchema(PuzzlesSchema);
Puzzles.publish(huntsMatchingCurrentUser);

ActiveOperatorRole.allow('mongo.puzzles.insert', () => true);
ActiveOperatorRole.allow('mongo.puzzles.update', () => true);

export default Puzzles;
