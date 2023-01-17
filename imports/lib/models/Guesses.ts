import { huntsMatchingCurrentUser } from '../../model-helpers';
import { GuessType } from '../schemas/Guess';
import Base from './Base';

const Guesses = new Base<GuessType>('guesses');
Guesses.publish(huntsMatchingCurrentUser);

export default Guesses;
