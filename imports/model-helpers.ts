import Mustache from "mustache";

import type { HuntType } from "./lib/models/Hunts";
import type { PuzzleType } from "./lib/models/Puzzles";

const answerify = function (answer: string): string {
  return answer.toUpperCase();
};

const guessURL = function (hunt: HuntType, puzzle: PuzzleType): string {
  if (!puzzle.url) {
    return "";
  }

  if (!hunt.submitTemplate) {
    return puzzle.url;
  }

  const url = new URL(puzzle.url);
  return Mustache.render(hunt.submitTemplate, url);
};

export { answerify, guessURL };
