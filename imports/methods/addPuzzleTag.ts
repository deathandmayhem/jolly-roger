import TypedMethod from './TypedMethod';

// addPuzzleTag takes a tag name, rather than a tag ID, so we can avoid doing
// two round-trips for tag creation.
export default new TypedMethod<{ puzzleId: string, tagName: string }, void>(
  'Puzzles.methods.addTag'
);
