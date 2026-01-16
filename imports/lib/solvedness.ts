import type { PuzzleType } from "./models/Puzzles";

export type Solvedness = "noAnswers" | "solved" | "unsolved";
export const computeSolvedness = (puzzle: PuzzleType): Solvedness => {
  if (puzzle.expectedAnswerCount === 0) {
    return puzzle.completedWithNoAnswer ? "solved" : "noAnswers";
  } else if (puzzle.answers.length < puzzle.expectedAnswerCount) {
    return "unsolved";
  } else {
    return "solved";
  }
};
