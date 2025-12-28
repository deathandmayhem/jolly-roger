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
