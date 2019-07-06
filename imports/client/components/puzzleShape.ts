import PuzzlesSchema, { PuzzleType } from '../../lib/schemas/puzzles';

const puzzleShape = PuzzlesSchema.asReactPropTypes<PuzzleType>();

export default puzzleShape;
