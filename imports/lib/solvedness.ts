import { PuzzleType } from './schemas/puzzle';

export type Solvedness = 'noAnswers' | 'solved' | 'unsolved';
export const computeSolvedness = (puzzle: PuzzleType): Solvedness => {
  if (puzzle.expectedAnswerCount === 0) {
    return 'noAnswers';
  } else if (puzzle.expectedAnswerCount < puzzle.answers.length) {
    return 'unsolved';
  } else {
    return 'solved';
  }
};
