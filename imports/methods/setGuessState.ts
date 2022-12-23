import { GuessType } from '../lib/schemas/Guess';
import TypedMethod from './TypedMethod';

export default new TypedMethod<{
  guessId: string,
  state: GuessType['state'],
  additionalNotes?: string,
}, void>(
  'Guesses.methods.setState'
);
