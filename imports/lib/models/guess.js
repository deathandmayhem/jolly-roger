import { huntsMatchingCurrentUser } from '../../model-helpers.js';
import GuessesSchema from '../schemas/guess.js';
import Base from './base.js';
import ActiveOperatorRole from '../active-operator-role.js';

const Guesses = new Base('guesses');
Guesses.attachSchema(GuessesSchema);
Guesses.publish(huntsMatchingCurrentUser);

// Operators can update guesses
ActiveOperatorRole.allow('mongo.guesses.update', () => true);

export default Guesses;
