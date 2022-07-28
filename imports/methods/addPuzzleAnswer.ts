import TypedMethod from './TypedMethod';

export default new TypedMethod<{ puzzleId: string, answer: string }, void>(
  'Puzzles.methods.addAnswer'
);
