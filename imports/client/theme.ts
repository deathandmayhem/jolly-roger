export type GuessState = keyof Theme["colors"]["guess"];
export type SolvednessState = keyof Theme["colors"]["solvedness"];

export interface Theme {
  colors: {
    background: string;
    text: string;
    primary: string;
    secondary: string;
    muted: string;
    danger: string;
    warning: string;
    info: string;
    success: string;
    callStateIcon: string;
    mutedIconBorder: string;
    deafenedIconBorder: string;
    mutedIconText: string;
    deafenedIconText: string;
    remoteMuteButtonHoverBackground: string;
    remoteMuteButtonHoverText: string;
    chatterSectionBackground: string;
    firehosePreWrapBackground: string;
    firehosePreWrapText: string;
    codeBlockBackground: string;
    codeBlockText: string;
    mentionSpanBackground: string;
    mentionSpanText: string;
    selectedMentionSpanShadow: string;
    selectedMentionSpanBackground: string;
    selectedMentionSpanText: string;
    autocompleteBackground: string;
    autocompleteShadow: string;
    matchCandidateSelectedBackground: string;
    documentMessageBackground: string;
    guessColorCorrectBackground: string;
    guessColorCorrectIcon: string;
    guessColorIntermediateBackground: string;
    guessColorIntermediateIcon: string;
    guessColorIncorrectBackground: string;
    guessColorIncorrectIcon: string;
    guessColorRejectedBackground: string;
    guessColorRejectedIcon: string;
    guessColorPendingBackground: string;
    guessColorPendingIcon: string;
    guessColorCorrectHoverBackground: string;
    guessColorIntermediateHoverBackground: string;
    guessColorIncorrectHoverBackground: string;
    guessColorRejectedHoverBackground: string;
    guessColorPendingHoverBackground: string;
    avatarInitialText: string;
    avatarInitialBackground: string;
    avatarSelfBorder: string;
    avatarSelfShadow: string;
    breadcrumbText: string;
    breadcrumbBeforeText: string;
    announcementToastBackground: string;
    announcementToastText: string;
    announcementToastBorder: string;
    replyChatMessageBackground: string;
    hoverChatMessageBackground: string;
    systemChatMessageBackground: string;
    pinnedChatMessageBackground: string;
    replyButtonText: string;
    hoverReplyButtonText: string;
    replyingToBackground: string;
    fancyEditorBackground: string;
    puzzleMetadataBackground: string;
    navBarBottomBorder: string;
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
}

export const lightTheme: Theme = {
  colors: {
    background: "var(--bs-body-bg)",
    text: "var(--bs-body-color)",
    primary: "var(--bs-primary)",
    secondary: "var(--bs-secondary)",
    muted: "#6c757d",
    danger: "var(--bs-danger)",
    warning: "var(--bs-warning)",
    info: "var(--bs-info)",
    success: "var(--bs-success)",
    callStateIcon: "#dc3545",
    mutedIconBorder: "#0d6efd",
    deafenedIconBorder: "#0d6efd",
    mutedIconText: "black",
    deafenedIconText: "black",
    remoteMuteButtonHoverBackground: "rgb(30 30 30 / 50%)",
    remoteMuteButtonHoverText: "#ccc",
    chatterSectionBackground: "#f3e5e5",
    firehosePreWrapBackground: "transparent",
    firehosePreWrapText: "black",
    codeBlockBackground: "#eee",
    codeBlockText: "black",
    mentionSpanBackground: "#ced0ed",
    mentionSpanText: "#4649ef",
    selectedMentionSpanShadow: "#b4d5ff",
    selectedMentionSpanBackground: "#ced0ed",
    selectedMentionSpanText: "#4649ef",
    autocompleteBackground: "white",
    autocompleteShadow: "0 1px 5px rgb(0 0 0 / 20%)",
    matchCandidateSelectedBackground: "#e0ecfc",
    documentMessageBackground: "#ddf",
    guessColorCorrectBackground: "#d4edda",
    guessColorCorrectIcon: "#155724",
    guessColorIntermediateBackground: "#fff3cd",
    guessColorIntermediateIcon: "#856404",
    guessColorIncorrectBackground: "#f8d7da",
    guessColorIncorrectIcon: "#721c24",
    guessColorRejectedBackground: "#e2e3e5",
    guessColorRejectedIcon: "#383d41",
    guessColorPendingBackground: "#fff",
    guessColorPendingIcon: "#000",
    guessColorCorrectHoverBackground: "#c3e6cb",
    guessColorIntermediateHoverBackground: "#ffeeba",
    guessColorIncorrectHoverBackground: "#f1c0c5",
    guessColorRejectedHoverBackground: "#d1d2d3",
    guessColorPendingHoverBackground: "#eee",
    avatarInitialText: "#ffffff",
    avatarInitialBackground: "#000000",
    avatarSelfBorder: "#0D6EFD",
    avatarSelfShadow: "rgba(13, 110, 253, 0.5)",
    breadcrumbText: "rgba(0 0 0 / 65%)",
    breadcrumbBeforeText: "rgba(0 0 0 / 65%)",
    announcementToastBackground: "white",
    announcementToastText: "black",
    announcementToastBorder: "rgba(0, 0, 0, 0.1)",
    replyChatMessageBackground: "#e0f0ff",
    hoverChatMessageBackground: "#f0f0f0",
    systemChatMessageBackground: "#e0e0e0",
    pinnedChatMessageBackground: "#ffff70",
    replyButtonText: "#666",
    hoverReplyButtonText: "#000",
    replyingToBackground: "#eee",
    fancyEditorBackground: "#eee",
    puzzleMetadataBackground: "white",
    navBarBottomBorder: "#6c757d",
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
};

export const darkTheme: Theme = {
  colors: {
    background: "var(--bs-dark-bg-subtle)",
    text: "var(--bs-body-color)",
    primary: "var(--bs-primary)",
    secondary: "var(--bs-secondary)",
    muted: "#6c757d",
    danger: "var(--bs-danger)",
    warning: "var(--bs-warning)",
    info: "var(--bs-info)",
    success: "var(--bs-success)",
    callStateIcon: "#f8d7da",
    mutedIconBorder: "#6fa8dc",
    deafenedIconBorder: "#6fa8dc",
    mutedIconText: "white",
    deafenedIconText: "white",
    remoteMuteButtonHoverBackground: "rgb(200 200 200 / 50%)",
    remoteMuteButtonHoverText: "#ccc",
    chatterSectionBackground: "#333",
    firehosePreWrapBackground: "#333",
    firehosePreWrapText: "white",
    codeBlockBackground: "#333",
    codeBlockText: "white",
    mentionSpanBackground: "#4649ef",
    mentionSpanText: "#fff",
    selectedMentionSpanShadow: "#b4d5ff",
    selectedMentionSpanBackground: "#4649ef",
    selectedMentionSpanText: "#fff",
    autocompleteBackground: "#333",
    autocompleteShadow: "0 1px 5px rgb(255 255 255 / 20%)",
    matchCandidateSelectedBackground: "#444",
    documentMessageBackground: "#333",
    guessColorCorrectBackground: "#155724",
    guessColorCorrectHoverBackground: "#11461b",
    guessColorCorrectIcon: "#d4edda",
    guessColorIncorrectBackground: "#721c24",
    guessColorIncorrectHoverBackground: "#5e171d",
    guessColorIncorrectIcon: "#f8d7da",
    guessColorIntermediateBackground: "#856404",
    guessColorIntermediateHoverBackground: "#6e5303",
    guessColorIntermediateIcon: "#fff3cd",
    guessColorPendingBackground: "#333",
    guessColorPendingHoverBackground: "#444",
    guessColorPendingIcon: "#fff",
    guessColorRejectedBackground: "#383d41",
    guessColorRejectedHoverBackground: "#2e3238",
    guessColorRejectedIcon: "#e2e3e5",
    avatarInitialText: "#ffffff",
    avatarInitialBackground: "#000000",
    avatarSelfBorder: "#6fa8dc",
    avatarSelfShadow: "rgba(111, 168, 220, 0.5)",
    breadcrumbText: "rgba(255 255 255 / 65%)",
    breadcrumbBeforeText: "rgba(255 255 255 / 65%)",
    announcementToastBackground: "#333",
    announcementToastText: "white",
    announcementToastBorder: "rgba(255, 255, 255, 0.1)",
    replyChatMessageBackground: "rgb(0, 56, 109)",
    hoverChatMessageBackground: "rgb(52, 52, 52)",
    systemChatMessageBackground: "rgb(31, 31, 31)",
    pinnedChatMessageBackground: "rgb(92, 56, 17)",
    replyButtonText: "#666",
    hoverReplyButtonText: "#000",
    replyingToBackground: "#383838",
    fancyEditorBackground: "#383838",
    puzzleMetadataBackground: "black",
    navBarBottomBorder: "#6c757d",
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
};
