import { huntsMatchingCurrentUser } from '../../model-helpers';
import ActiveOperatorRole from '../active-operator-role';
import GuessesSchema, { GuessType } from '../schemas/guess';
import Base from './base';

const Guesses = new Base<GuessType>('guesses');
Guesses.attachSchema(GuessesSchema);
Guesses.publish(huntsMatchingCurrentUser);

// Operators can update guesses
ActiveOperatorRole.allow('mongo.guesses.update', () => true);

export default Guesses;
