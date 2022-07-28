import TypedMethod from './TypedMethod';

export default new TypedMethod<{ puzzleId: string, replacedBy?: string }, void>(
  'Puzzles.methods.destroy'
);
