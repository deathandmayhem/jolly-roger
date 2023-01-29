import TypedPublication from './TypedPublication';

export default new TypedPublication<{ puzzleId: string, huntId: string }>(
  'Puzzles.publications.forPuzzlePage'
);
