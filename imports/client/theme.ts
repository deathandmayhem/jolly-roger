import type { ThemeConfig } from "react-select";

export type GuessState = keyof Theme["colors"]["guess"];
export type SolvednessState = keyof Theme["colors"]["solvedness"];

export interface Theme {
  basicMode: string;
  colors: {
    background: string;
    text: string;
    border: string;
    primary: string;
    secondary: string;
    callStateIcon: string;
    mutedIconBorder: string;
    deafenedIconBorder: string;
    mutedIconText: string;
    localMutedIconText: string;
    remoteMuteButtonHoverBackground: string;
    remoteMuteButtonHoverText: string;
    chatterSectionBackground: string;
    codeBlockBackground: string;
    codeBlockText: string;
    mentionSpanBackground: string;
    mentionSpanText: string;
    selfMentionSpanBackground: string;
    selfMentionSpanText: string;
    selectedMentionSpanShadow: string;
    autocompleteBackground: string;
    autocompleteShadow: string;
    matchCandidateSelectedBackground: string;
    documentMessageBackground: string;
    avatarInitialText: string;
    avatarInitialBackground: string;
    avatarSelfBorder: string;
    avatarSelfShadow: string;
    breadcrumbText: string;
    breadcrumbBeforeText: string;
    announcementToastBackground: string;
    announcementToastText: string;
    announcementToastBorder: string;
    hoverChatMessageBackground: string;
    systemChatMessageBackground: string;
    pinnedChatMessageBackground: string;
    fancyEditorBackground: string;
    navBarBottomBorder: string;
    navBarBackground: string;
    setupPageHeaderBackground: string;
    setupPageCircuitBreakerHeaderBackground: string;
    jumbotronBackground: string;
    guess: {
      correct: {
        background: string;
        hoverBackground: string;
        icon: string;
      };
      intermediate: {
        background: string;
        hoverBackground: string;
        icon: string;
      };
      incorrect: {
        background: string;
        hoverBackground: string;
        icon: string;
      };
      rejected: {
        background: string;
        hoverBackground: string;
        icon: string;
      };
      pending: {
        background: string;
        hoverBackground: string;
        icon: string;
      };
    };
    solvedness: {
      noAnswers: string;
      unsolved: string;
      solved: string;
    };
  };
  reactSelectTheme: ThemeConfig;
}

export const lightTheme: Theme = {
  basicMode: "light",
  colors: {
    background: "var(--bs-body-bg)",
    text: "var(--bs-body-color)",
    border: "var(--bs-border-color)",
    primary: "var(--bs-primary)",
    secondary: "var(--bs-secondary)",
    callStateIcon: "#dc3545",
    mutedIconBorder: "#0d6efd",
    deafenedIconBorder: "#0d6efd",
    mutedIconText: "red",
    localMutedIconText: "black",
    remoteMuteButtonHoverBackground: "rgb(30 30 30 / 50%)",
    remoteMuteButtonHoverText: "#ccc",
    chatterSectionBackground: "#f3e5e5",
    codeBlockBackground: "#eee",
    codeBlockText: "black",
    mentionSpanBackground: "#eef",
    mentionSpanText: "inherit",
    selfMentionSpanBackground: "#ced0ed",
    selfMentionSpanText: "#4649ef",
    selectedMentionSpanShadow: "#b4d5ff",
    autocompleteBackground: "white",
    autocompleteShadow: "0 1px 5px rgb(0 0 0 / 20%)",
    matchCandidateSelectedBackground: "#e0ecfc",
    documentMessageBackground: "#ddf",
    avatarInitialText: "#ffffff",
    avatarInitialBackground: "#000000",
    avatarSelfBorder: "#0D6EFD",
    avatarSelfShadow: "rgba(13, 110, 253, 0.5)",
    breadcrumbText: "rgba(0 0 0 / 65%)",
    breadcrumbBeforeText: "rgba(0 0 0 / 65%)",
    announcementToastBackground: "white",
    announcementToastText: "black",
    announcementToastBorder: "rgba(0, 0, 0, 0.1)",
    hoverChatMessageBackground: "#f0f0f0",
    systemChatMessageBackground: "#e0e0e0",
    pinnedChatMessageBackground: "#ffff70",
    fancyEditorBackground: "#eee",
    navBarBottomBorder: "#6c757d",
    navBarBackground: "#f0f0f0",
    setupPageHeaderBackground: "#f0f0f0",
    setupPageCircuitBreakerHeaderBackground: "#eef",
    jumbotronBackground: "#e9ecef",
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
    solvedness: {
      noAnswers: "#dfdfff",
      unsolved: "#f0f0f0",
      solved: "#dfffdf",
    },
  },
  reactSelectTheme: {
    borderRadius: 4,
    colors: {
      primary: "#2684FF",
      primary75: "#4C9AFF",
      primary50: "#B2D4FF",
      primary25: "#DEEBFF",

      danger: "#DE350B",
      dangerLight: "#FFBDAD",

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

export const darkTheme: Theme = {
  basicMode: "dark",
  colors: {
    background: "var(--bs-dark-bg-subtle)",
    text: "var(--bs-body-color)",
    border: "var(--bs-border-color)",
    primary: "var(--bs-primary)",
    secondary: "var(--bs-secondary)",
    callStateIcon: "#f8d7da",
    mutedIconBorder: "#6fa8dc",
    deafenedIconBorder: "#6fa8dc",
    mutedIconText: "red",
    localMutedIconText: "black",
    remoteMuteButtonHoverBackground: "rgb(200 200 200 / 50%)",
    remoteMuteButtonHoverText: "#ccc",
    chatterSectionBackground: "#333",
    codeBlockBackground: "#333",
    codeBlockText: "white",
    mentionSpanBackground: "#444",
    mentionSpanText: "inherit",
    selfMentionSpanBackground: "#4649ef",
    selfMentionSpanText: "#fff",
    selectedMentionSpanShadow: "#b4d5ff",
    autocompleteBackground: "#333",
    autocompleteShadow: "0 1px 5px rgb(255 255 255 / 20%)",
    matchCandidateSelectedBackground: "#444",
    documentMessageBackground: "#333",
    avatarInitialText: "#ffffff",
    avatarInitialBackground: "#000000",
    avatarSelfBorder: "#6fa8dc",
    avatarSelfShadow: "rgba(111, 168, 220, 0.5)",
    breadcrumbText: "rgba(255 255 255 / 65%)",
    breadcrumbBeforeText: "rgba(255 255 255 / 65%)",
    announcementToastBackground: "#333",
    announcementToastText: "white",
    announcementToastBorder: "rgba(255, 255, 255, 0.1)",
    hoverChatMessageBackground: "#222",
    systemChatMessageBackground: "rgb(31, 31, 31)",
    pinnedChatMessageBackground: "rgb(92, 56, 17)",
    fancyEditorBackground: "#383838",
    navBarBottomBorder: "#6c757d",
    navBarBackground: "#333333",
    setupPageHeaderBackground: "#333333",
    setupPageCircuitBreakerHeaderBackground: "#333355",
    jumbotronBackground: "inherit",
    guess: {
      correct: {
        background: "#155724",
        hoverBackground: "#11461b",
        icon: "#d4edda",
      },
      intermediate: {
        background: "#856404",
        hoverBackground: "#6e5303",
        icon: "#fff3cd",
      },
      incorrect: {
        background: "#721c24",
        hoverBackground: "#5e171d",
        icon: "#f8d7da",
      },
      rejected: {
        background: "#383d41",
        hoverBackground: "#2e3238",
        icon: "#e2e3e5",
      },
      pending: {
        background: "#333",
        hoverBackground: "#444",
        icon: "#fff",
      },
    },
    solvedness: {
      noAnswers: "rgb(77, 77, 118)",
      unsolved: "rgb(46, 46, 46)",
      solved: "rgb(32, 66, 32)",
    },
  },
  reactSelectTheme: {
    borderRadius: 4,
    colors: {
      primary25: "#2684FF",
      primary50: "#4C9AFF",
      primary75: "#B2D4FF",
      primary: "#DEEBFF",

      dangerLight: "#DE350B",
      danger: "#FFBDAD",

      neutral90: "hsl(0, 0%, 100%)",
      neutral80: "hsl(0, 0%, 95%)",
      neutral70: "hsl(0, 0%, 90%)",
      neutral60: "hsl(0, 0%, 80%)",
      neutral50: "hsl(0, 0%, 70%)",
      neutral40: "hsl(0, 0%, 60%)",
      neutral30: "hsl(0, 0%, 50%)",
      neutral20: "hsl(0, 0%, 40%)",
      neutral10: "hsl(0, 0%, 30%)",
      neutral5: "hsl(0, 0%, 20%)",
      neutral0: "hsl(0, 0%, 10%)",
    },
    spacing: {
      baseUnit: 4,
      controlHeight: 38,
      menuGutter: 8,
    },
  },
};
