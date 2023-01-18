import { huntsMatchingCurrentUser } from '../../model-helpers';
import type { GuessType } from '../schemas/Guess';
import Base from './Base';

const Guesses = new Base<GuessType>('guesses');
Guesses.publish(huntsMatchingCurrentUser);

export default Guesses;
