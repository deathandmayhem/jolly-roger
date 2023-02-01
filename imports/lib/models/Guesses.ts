import Guess from '../schemas/Guess';
import type { ModelType } from './Model';
import SoftDeletedModel from './SoftDeletedModel';

const Guesses = new SoftDeletedModel('jr_guesses', Guess);
export type GuessType = ModelType<typeof Guesses>;

export default Guesses;
