import type { GuessType } from '../schemas/Guess';
import Base from './Base';

const Guesses = new Base<GuessType>('guesses');

export default Guesses;
