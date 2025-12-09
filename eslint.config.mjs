import { defineConfig } from "eslint/config";
import jollyRoger from "eslint-plugin-jolly-roger";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: [".meteor/**", "eslint/dist/**", "**/node_modules/**"],
  },
  tseslint.configs.base,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
      reportUnusedInlineConfigs: "error",
    },
    plugins: {
      "jolly-roger": jollyRoger,
    },
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "jolly-roger/no-disallowed-sync-methods": "error",
    },
  },
  {
    files: ["**/client/**"],
    rules: {
      "jolly-roger/no-disallowed-sync-methods": "off",
    },
  },
);
