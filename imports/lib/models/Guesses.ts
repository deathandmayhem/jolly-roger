import { huntsMatchingCurrentUser } from '../../model-helpers';
import GuessesSchema, { GuessType } from '../schemas/Guess';
import Base from './Base';

const Guesses = new Base<GuessType>('guesses');
Guesses.attachSchema(GuessesSchema);
Guesses.publish(huntsMatchingCurrentUser);

export default Guesses;
