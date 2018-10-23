import { huntsMatchingCurrentUser } from '../../model-helpers.js';
import GuessesSchema from '../schemas/guess.js';
import Base from './base.js';

const Guesses = new Base('guesses');
Guesses.attachSchema(GuessesSchema);
Guesses.publish(huntsMatchingCurrentUser);

export default Guesses;
