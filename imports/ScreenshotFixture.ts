// Users

export const PRIMARY_USER = {
  email: "drew@deathandmayhem.com",
  password: "screenshots-password",
  displayName: "Drew",
};

export const SECONDARY_USER = {
  email: "evan@deathandmayhem.com",
  password: "screenshots-password",
  displayName: "Evan",
};

// Google Sheet linked to the chat puzzle

export const GOOGLE_SHEET_ID = "1WrVrMjkqHLERjURZ94yrU22fa_KzhBqnF4GN42FopiI";

// Puzzle references (by title)

export const CHAT_PUZZLE_TITLE = "Yeah, but It Didn\u2019t Work!";
export const TAG_HOVER_PUZZLE_TITLE = "Arts and Crafts";
export const GUESS_PUZZLE_TITLE = "Fowlty Towers";
export const SPARKLINE_PUZZLE_TITLE = "Don\u2019t Look";
export const BOOKMARK_PUZZLE_TITLE = "Warm and Fuzzy";
export const DINGWORD_PUZZLE_TITLE = "Clueless";

// Tag references

export const TAG_HOVER_TAG = "group:build";
export const COLLAPSE_LIST_TAGS = ["group:games-island"];

// Chat messages for the chat screenshot

export const CHAT_MESSAGES = [
  "Jolly Roger provides its own persistent chat with each puzzle. No need to constantly jump between the spreadsheet and a third-party chat service. No losing relevant discussion to 10000-message retention limits in the middle of the Hunt.",
  "We intentionally keep the chat pane always visible on each puzzle page, so remote hunters desperately trying to get your attention are hard to accidentally ignore.",
  "Supports basic formatting:",
  "_italics_",
  "**bold**",
  "~~strikethrough~~",
  "`monospace`",
  "```\ncode blocks\n```",
  "> blockquotes",
];
