import Puzzle from '../schemas/Puzzle';
import type { ModelType } from './Model';
import SoftDeletedModel from './SoftDeletedModel';

const Puzzles = new SoftDeletedModel('jr_puzzles', Puzzle);
export type PuzzleType = ModelType<typeof Puzzles>;

export default Puzzles;
