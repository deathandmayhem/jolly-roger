import TypedMethod from './TypedMethod';

export default new TypedMethod<{ puzzleId: string, bookmark: boolean }, void>(
  'Puzzles.methods.bookmark'
);
