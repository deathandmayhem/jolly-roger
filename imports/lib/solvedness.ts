import type { PuzzleType } from "./models/Puzzles";

export type Solvedness = "noAnswers" | "solved" | "unsolved";
export const computeSolvedness = (puzzle: PuzzleType): Solvedness => {
  if (puzzle.expectedAnswerCount === 0) {
    return "noAnswers";
  } else if (puzzle.answers.length < puzzle.expectedAnswerCount || puzzle.expectedAnswerCount === -1) {
    return "unsolved";
  } else {
    return "solved";
  }
};
