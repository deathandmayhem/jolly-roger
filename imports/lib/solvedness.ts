import { PuzzleType } from './schemas/Puzzle';

export type Solvedness = 'noAnswers' | 'solved' | 'unsolved';
export const computeSolvedness = (puzzle: PuzzleType): Solvedness => {
  if (puzzle.expectedAnswerCount === 0) {
    return 'noAnswers';
  } else if (puzzle.answers.length < puzzle.expectedAnswerCount) {
    return 'unsolved';
  } else {
    return 'solved';
  }
};
