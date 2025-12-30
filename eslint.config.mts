import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import jollyRoger from "./eslint/index";

export default defineConfig(
  {
    ignores: [".meteor/**", "eslint/dist/**", "**/node_modules/**", "eslint.config.mts", "eslint/**"],
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
      "jolly-roger": jollyRoger as any,
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
