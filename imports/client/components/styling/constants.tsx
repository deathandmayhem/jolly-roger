import type { GuessType } from "../../../lib/models/Guesses";
import type { Solvedness } from "../../../lib/solvedness";

export const NavBarHeight = "50px";

export const MonospaceFontFamily =
  '"Platform Emoji", "Source Code Pro", "Consolas", "Monaco", monospace, "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji"';

export const PuzzlePagePadding = "8px";

export const SolvedPuzzleBackgroundColor = "#dfffdf";
export const UnsolvedPuzzleBackgroundColor = "#f0f0f0";
export const ExpectsNoAnswersPuzzleBackgroundColor = "#dfdfff";

export const backgroundColorLookupTable: Record<Solvedness, string> = {
  noAnswers: ExpectsNoAnswersPuzzleBackgroundColor,
  solved: SolvedPuzzleBackgroundColor,
  unsolved: UnsolvedPuzzleBackgroundColor,
};

export const guessColorLookupTable: Record<
  GuessType["state"],
  { background: string; hoverBackground: string; icon: string }
> = {
  correct: {
    background: "#f0fff0",
    hoverBackground: "#d0ffd0",
    icon: "#00ff00",
  },
  intermediate: {
    background: "#fffff0",
    hoverBackground: "#ffffd0",
    icon: "#dddd00",
  },
  incorrect: {
    background: "#fff0f0",
    hoverBackground: "#ffd0d0",
    icon: "#ff0000",
  },
  rejected: {
    background: "#f0f0f0",
    hoverBackground: "#d0d0d0",
    icon: "#000000",
  },
  pending: {
    background: "#f0f0ff",
    hoverBackground: "#d0d0ff",
    icon: "#0000ff",
  },
};
