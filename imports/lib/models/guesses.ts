import { huntsMatchingCurrentUser } from '../../model-helpers';
import GuessesSchema, { GuessType } from '../schemas/guess';
import Base from './base';

const Guesses = new Base<GuessType>('guesses');
Guesses.attachSchema(GuessesSchema);
Guesses.publish(huntsMatchingCurrentUser);

export default Guesses;
