import TypedMethod from './TypedMethod';

export default new TypedMethod<{
  puzzleId: string,
  guess: string,
  direction: number,
  confidence: number,
}, string>(
  'Guesses.method.create'
);
