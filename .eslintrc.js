module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  parserOptions: {
    allowImportExportEverywhere: false,
    tsconfigRootDir: __dirname,
    project: "./tsconfig.json",
  },
  plugins: ["jolly-roger"],
  reportUnusedDisableDirectives: true,
  rules: {
    "jolly-roger/no-disallowed-sync-methods": ["error"],
  },
  overrides: [
    {
      // eslint by default only lints .js files, but will lint any file whose extension is mentioned in an override
      files: ["*.ts", "*.tsx"],
    },
    {
      files: "**/client/**",
      env: {
        browser: true,
      },
      rules: {
        "jolly-roger/no-disallowed-sync-methods": "off",
      },
    },
    {
      files: "eslint/**",
      parserOptions: { project: "eslint/tsconfig.json" },
    },
    {
      files: "**/server/**",
      env: {
        node: true,
      },
    },
  ],
};
