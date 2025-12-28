import type { ThemeConfig } from "react-select";
import type { GuessType } from "../lib/models/Guesses";
import type { Solvedness } from "../lib/solvedness";

export type Colors = {
  background: string;
  text: string;
};

type GuessColorLookupTable = Record<
  GuessType["state"],
  { background: string; hoverBackground: string; icon: string }
>;

type SolvednessColorLookupTable = Record<Solvedness, string>;

export interface Theme {
  colors: {
    avatarSelfBorder: string;
    avatarSelfShadow: string;
    breadcrumbText: string;
    codeBlock: Colors;
    guess: GuessColorLookupTable;
    mention: Colors;
    highlightedMention: Colors;
    solvedness: SolvednessColorLookupTable;
  };
  reactSelectTheme: ThemeConfig;
}

export const defaultTheme: Theme = {
  colors: {
    avatarSelfBorder: "#0d6efd",
    avatarSelfShadow: "rgba(13, 110, 253, 0.5)",
    breadcrumbText: "rgb(0 0 0 / 65%)",
    codeBlock: {
      background: "#eee",
      text: "black",
    },
    guess: {
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
    },
    mention: {
      background: "#ced0ed",
      text: "#4649e",
    },
    highlightedMention: {
      background: "#4649ef",
      text: "#fff",
    },
    solvedness: {
      noAnswers: "#dfdfff",
      solved: "#dfffdf",
      unsolved: "#f0f0f0",
    },
  },
  reactSelectTheme: {
    borderRadius: 4,
    colors: {
      primary: "#2684ff",
      primary75: "#4c9aff",
      primary50: "#b2d4ff",
      primary25: "#deebff",
      danger: "#de350b",
      dangerLight: "ffbdad",
      neutral0: "hsl(0, 0%, 100%)",
      neutral5: "hsl(0, 0%, 95%)",
      neutral10: "hsl(0, 0%, 90%)",
      neutral20: "hsl(0, 0%, 80%)",
      neutral30: "hsl(0, 0%, 70%)",
      neutral40: "hsl(0, 0%, 60%)",
      neutral50: "hsl(0, 0%, 50%)",
      neutral60: "hsl(0, 0%, 40%)",
      neutral70: "hsl(0, 0%, 30%)",
      neutral80: "hsl(0, 0%, 20%)",
      neutral90: "hsl(0, 0%, 10%)",
    },
    spacing: {
      baseUnit: 4,
      controlHeight: 38,
      menuGutter: 8,
    },
  },
};
