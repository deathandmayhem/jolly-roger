# Migration Plan: Biome to Oxlint + Oxfmt

This document outlines the step-by-step migration from Biome to Oxlint (linting) and Oxfmt (formatting).

## Overview

The migration is organized into logical phases:

| Phase | Description                                            |
| ----- | ------------------------------------------------------ |
| 1     | Add oxlint configuration                               |
| 2     | Switch linting from biome to oxlint + migrate comments |
| 3     | Switch formatting from biome to oxfmt                  |
| 4     | Fix lint violations one-by-one                         |
| 5     | Remove biome completely                                |

**Key design decision:** Phase 2 introduces the complete final configuration with all rules enabled from the start. Phase 4 then fixes violations one-by-one.

---

## Phase 1: Add Oxlint Configuration

**Goal:** Add oxlint packages and configuration files.

### Tasks

1. Install packages:

   ```bash
   meteor npm install --save-dev oxlint oxlint-tsgolint
   ```

2. Create `.oxlintrc.json` with the complete final configuration (see Final Configuration below)

3. Add npm scripts:

   ```json
   {
     "lint:oxlint": "oxlint --tsconfig tsconfig.json --type-aware --deny-warnings --report-unused-disable-directives"
   }
   ```

### Configuration Notes

**Rules explicitly disabled (intentional codebase patterns):**

- `no-this-alias` - Used in `throttle.ts` for `this` binding
- `jsx-a11y/no-autofocus` - Intentional UX for form fields
- `jsx-a11y/media-has-caption` - Audio elements for voice calls
- `import/default` - False positive on chai (CommonJS interop)
- `import/no-unassigned-import` - CSS and side-effect imports
- `import/no-named-as-default` - False positives on styled-components (idiomatic usage)
- `import/no-named-as-default-member` - False positive on chai.use
- `react/react-in-jsx-scope` - Not needed for React 17+
- `promise/always-return` - Not always required
- `promise/no-callback-in-promise` - Express async wrapper pattern
- `promise/no-promise-in-callback` - Valid async patterns in callbacks

**Rules disabled (too noisy or not useful):**

- `typescript/no-unsafe-type-assertion` - Too many false positives with `as` casts
- `typescript/no-confusing-void-expression` - Too strict for arrow function shorthands
- `typescript/restrict-template-expressions` - Flags valid template literal usages
- `typescript/prefer-enum-initializers` - Enums are used sparingly and values are obvious from context
- `unicorn/no-nested-ternary` - Conflicts with oxfmt (formatter removes the parentheses the rule requires)

**Rules configured with special options:**

- `no-unused-vars` - Configured to ignore `_`-prefixed variables
- `react/exhaustive-deps` - Configured with `additionalHooks: "useTracker"`
- `typescript/consistent-type-imports` - Configured with `disallowTypeAnnotations: false` to allow `typeof import(...)` patterns
- `eqeqeq` - Configured with `smart` option to allow `== null` / `!= null` idiom
- `typescript/no-deprecated` - Configured with `allow: ["findOne"]` since `findOne` is intentionally used throughout the codebase

**Overrides for specific files:**

- `tests/**` - `unicorn/consistent-function-scoping` off (test setup functions share refs via scope)
- `types/**/*.d.ts` - `unicorn/require-module-specifiers` off, `typescript/no-empty-interface` off (module augmentation)
- `imports/client/components/Routes.tsx` - `oxc/no-map-spread` off (small static arrays)
- `imports/lib/throttle.ts` - `unicorn/no-this-assignment` off (intentional pattern)

---

## Phase 2: Switch Linting to Oxlint

**Goal:** Replace biome's linter with oxlint and migrate suppression comments.

### Tasks

1. Migrate biome suppression comments (see Phase 2a below)

2. Verify migrated directives are still needed by running with `--report-unused-disable-directives` and removing any that are no longer necessary

3. Update `package.json` scripts:
   - Remove `lint:biome` (oxlint is already configured as `lint:oxlint` from Phase 1)
   - The main `lint` script (`concurrently npm:lint:*`) will automatically pick up `lint:oxlint`

4. Update `biome.jsonc` to disable linting:

   ```jsonc
   {
     "linter": {
       "enabled": false,
     },
   }
   ```

5. Keep `lint:eslint` for the custom Meteor rule (see note below)

### Note: Custom ESLint Plugin

The custom `jolly-roger/no-disallowed-sync-methods` rule in `eslint/` must continue running under ESLint because:

- It uses TypeScript type information to identify Meteor types
- Oxlint's JS plugin support does not yet support type-aware custom rules
- The rule is only needed for server-side code (`**/client/**` is excluded)

`lint:eslint` should remain in `package.json` and will continue to run as part of `npm run lint`.

---

## Phase 2a: Biome Comment Migration

The codebase contains `biome-ignore` comments that need to be migrated to oxlint's `oxlint-disable` format or removed.

### Oxlint Directive Syntax

```javascript
// oxlint-disable-next-line rule-name -- reason
// oxlint-disable-next-line rule-name, other-rule -- reason
// oxlint-disable rule-name -- disable for rest of file
// oxlint-disable-line rule-name -- disable for current line
```

### Comment Migration Map

| Biome Rule                                   | Oxlint Rule                | Action                           |
| -------------------------------------------- | -------------------------- | -------------------------------- |
| `lint/suspicious/noConsole`                  | `no-console`               | Migrate comments                 |
| `lint/nursery/noUnusedExpressions`           | `no-unused-expressions`    | Migrate - enabled in correctness |
| `lint/style/useDefaultSwitchClause`          | `default-case`             | Remove (not enabled)             |
| `lint/correctness/useExhaustiveDependencies` | `react/exhaustive-deps`    | Migrate - enabled in correctness |
| `lint/suspicious/noArrayIndexKey`            | `react/no-array-index-key` | Remove (only warning in perf)    |
| `lint/correctness/useUniqueElementIds`       | (no equivalent)            | Remove                           |
| `lint/correctness/noUnusedVariables`         | `no-unused-vars`           | Migrate - enabled in correctness |

### Files Requiring Migration

**Must migrate (rules are enabled):**

| File                                                  | Current Comment                                           | New Comment                                        |
| ----------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------- |
| `imports/server/onExit.ts`                            | `biome-ignore-all lint/suspicious/noConsole`              | `oxlint-disable no-console` (file-level, 2 usages) |
| `imports/server/publishJoinedQuery.ts` (2x)           | `biome-ignore lint/suspicious/noConsole`                  | `oxlint-disable-next-line no-console`              |
| `imports/client/components/FancyEditor.tsx`           | `biome-ignore lint/suspicious/noConsole`                  | `oxlint-disable-next-line no-console`              |
| `imports/client/components/CopyToClipboardButton.tsx` | `biome-ignore lint/suspicious/noConsole`                  | `oxlint-disable-next-line no-console`              |
| `imports/client/tracing.ts`                           | `biome-ignore-all lint/suspicious/noConsole`              | `oxlint-disable no-console` (file-level, 3 usages) |
| `imports/server/hooks/ChatNotificationHooks.ts`       | `biome-ignore lint/nursery/noUnusedExpressions`           | `oxlint-disable-next-line no-unused-expressions`   |
| `imports/client/components/FancyEditor.tsx` (4x)      | `biome-ignore lint/nursery/noUnusedExpressions`           | `oxlint-disable-next-line no-unused-expressions`   |
| `imports/client/components/FirehosePage.tsx` (2x)     | `biome-ignore lint/correctness/useExhaustiveDependencies` | `oxlint-disable-next-line react/exhaustive-deps`   |
| `imports/client/components/ChatPeople.tsx`            | `biome-ignore lint/correctness/useExhaustiveDependencies` | `oxlint-disable-next-line react/exhaustive-deps`   |
| `imports/client/components/PuzzlePage.tsx` (3x)       | `biome-ignore lint/correctness/useExhaustiveDependencies` | `oxlint-disable-next-line react/exhaustive-deps`   |
| `imports/client/components/RelativeTime.tsx`          | `biome-ignore lint/correctness/useExhaustiveDependencies` | `oxlint-disable-next-line react/exhaustive-deps`   |
| `imports/client/components/PuzzleActivity.tsx`        | `biome-ignore lint/correctness/useExhaustiveDependencies` | `oxlint-disable-next-line react/exhaustive-deps`   |
| `imports/client/hooks/useCallState.ts` (5x)           | `biome-ignore lint/correctness/useExhaustiveDependencies` | `oxlint-disable-next-line react/exhaustive-deps`   |

**Can remove (rules not enabled, no equivalent, or not flagged):**

| File                                           | Current Comment                                     | Reason to Remove                                      |
| ---------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------- |
| `imports/client/configureLogger.ts`            | `biome-ignore lint/suspicious/noConsole`            | Dynamic `console[level]` access not flagged by oxlint |
| `imports/lib/models/generateJsonSchema.ts`     | `biome-ignore lint/style/useDefaultSwitchClause`    | `default-case` not enabled                            |
| `imports/client/components/PuzzleListPage.tsx` | `biome-ignore lint/style/useDefaultSwitchClause`    | `default-case` not enabled                            |
| `imports/client/components/SetupPage.tsx` (6x) | `biome-ignore lint/correctness/useUniqueElementIds` | No oxlint equivalent                                  |
| `imports/client/components/PuzzleAnswer.tsx`   | `biome-ignore lint/suspicious/noArrayIndexKey`      | `no-array-index-key` only in perf (warn)              |
| `imports/client/components/ChatMessage.tsx`    | `biome-ignore-all lint/suspicious/noArrayIndexKey`  | `no-array-index-key` only in perf (warn)              |
| `private/google-script/main.js`                | `biome-ignore lint/correctness/noUnusedVariables`   | File is in `ignorePatterns`                           |

---

## Phase 3: Switch Formatting to Oxfmt

**Goal:** Replace biome's formatter with oxfmt. This will modify files.

This phase produces two commits: the first contains only formatting changes (for clean `git blame`), and the second adds the tooling and configuration.

### Commit 1: Format all files

1. Install oxfmt and create `.oxfmtrc.json` (temporarily, for running the formatter)

2. Convert multiline CSS comments to singleline. Oxfmt cannot stably format multiline CSS comments (e.g., in styled-components template literals), so these must be converted to singleline comments before formatting.

3. Run oxfmt to format all files:

   ```bash
   npx oxfmt .
   ```

   (Note: `oxfmt` writes in place by default; use `--check` for verification only)

4. Commit **only the formatted source files** (not `package.json`, `.oxfmtrc.json`, etc.):

   ```
   Reformat codebase with oxfmt

   This commit contains only formatting changes from migrating
   from Biome to Oxfmt. No functional changes.
   ```

### Commit 2: Add oxfmt configuration and update tooling

1. Add `.oxfmtrc.json` with formatting configuration matching current biome settings

2. Update `package.json`:
   - Add oxfmt dependency (from the install in commit 1)
   - Add `lint:oxfmt` script:
     ```json
     {
       "lint:oxfmt": "oxfmt --check"
     }
     ```
   - The main `lint` script will automatically include format checking via `concurrently npm:lint:*`

3. Update `biome.jsonc` to disable formatting:

   ```jsonc
   {
     "formatter": {
       "enabled": false,
     },
   }
   ```

4. Add the formatting commit SHA to `.git-blame-ignore-revs`:

   ```bash
   echo "# Oxfmt migration - formatting only" >> .git-blame-ignore-revs
   echo "<commit-sha>" >> .git-blame-ignore-revs
   ```

5. Update CI to use oxfmt for format checking

6. Commit all tooling/configuration changes:

   ```
   Add oxfmt configuration and disable biome formatting
   ```

### Expected Changes

- ~305 files will be reformatted
- Import ordering will be adjusted to match configured groups
- Minor whitespace/formatting differences from Prettier-compatible output

---

## Phase 4: Fix Lint Violations

**Goal:** Fix violations one-by-one.

**Process for each sub-phase:** Create a separate commit for each sub-phase. Before committing, verify that:

1. The code still passes `npx oxfmt --check` (formatting is preserved)
2. There are no remaining violations for the rules covered by that sub-phase

Include the specific rules being fixed in the commit message (e.g., `Fix unicorn/no-array-sort, unicorn/no-array-reverse, ...`).

**Note:** Modifying source files may trigger the docs freshness checker (`npm run lint:docs`). If any modified file is referenced in a `docs/*.md` front matter `files` list, bump that doc's `updated` field to today's date.

### Phase 4a: Modern array methods

Use modern array methods: `toSorted()`, `toReversed()`, `Array.from()`, `flatMap()`, `at()`, `some()`, `includes()`.

| Rule                            | Violations | Fix                                           |
| ------------------------------- | ---------- | --------------------------------------------- |
| `unicorn/no-array-sort`         | 1          | Use `toSorted()`                              |
| `unicorn/no-array-reverse`      | 4          | Use `toReversed()`                            |
| `unicorn/no-new-array`          | 3          | Use `Array.from({ length: n })`               |
| `unicorn/prefer-array-flat-map` | 1          | Use `flatMap()` instead of `map().flat()`     |
| `unicorn/prefer-at`             | 12         | Use `at(-1)` instead of `arr[arr.length - 1]` |
| `unicorn/prefer-array-some`     | 1          | Use `some()` instead of `find()` for boolean  |
| `unicorn/prefer-includes`       | 2          | Use `includes()` instead of `indexOf()`       |

**Note:** `unicorn/no-new-array` and `unicorn/new-for-builtins` (Phase 4d) interact: `new-for-builtins` requires `new Array()` instead of `Array()`, but `no-new-array` forbids `new Array(singleArgument)`. The fix for both is `Array.from({ length: n })`. Handle all `Array()` / `new Array()` calls with a single argument in this phase to avoid creating violations for the other rule.

### Phase 4b: Modern string methods

Use `replaceAll()` and `slice()`.

| Rule                                | Violations | Fix                                         |
| ----------------------------------- | ---------- | ------------------------------------------- |
| `unicorn/prefer-string-replace-all` | 2          | Use `replaceAll()` instead of `replace(/g)` |
| `unicorn/prefer-string-slice`       | 5          | Use `slice()` instead of `substring()`      |

### Phase 4c: Remove unnecessary code

Remove redundant code patterns.

| Rule                                        | Violations | Fix                              |
| ------------------------------------------- | ---------- | -------------------------------- |
| `unicorn/no-useless-fallback-in-spread`     | 2          | Remove `?? {}`                   |
| `unicorn/no-useless-length-check`           | 1          | Remove `.length === 0 \|\|`      |
| `unicorn/no-useless-switch-case`            | 1          | Remove useless case before default |
| `unicorn/no-immediate-mutation`             | 3          | Inline value into object literal   |
| `unicorn/no-useless-spread`                 | 1          | Use `puzzles.map()` directly     |
| `unicorn/no-unnecessary-array-splice-count` | 1          | Remove unnecessary count arg     |
| `unicorn/no-useless-promise-resolve-reject` | 1          | Simplify promise return          |
| `unicorn/no-length-as-slice-end`            | 2          | Remove `.slice(x, arr.length)`   |
| `unicorn/no-unnecessary-slice-end`          | 2          | Remove unnecessary slice end arg |

### Phase 4d: Literal and style consistency

Consistent formatting for literals.

| Rule                                    | Violations | Fix                                    |
| --------------------------------------- | ---------- | -------------------------------------- |
| `unicorn/no-zero-fractions`             | 2          | Remove `.0` from number literals       |
| `unicorn/text-encoding-identifier-case` | 1          | Lowercase encoding names               |
| `unicorn/new-for-builtins`              | 2          | Add `new` for builtins that require it |

**Note:** Only apply `new-for-builtins` to calls where the single-argument form is not involved (e.g. `Array(n).fill()`), since those should have been converted to `Array.from()` in Phase 4a. See the note in Phase 4a about the interaction between `new-for-builtins` and `no-new-array`.

### Phase 4e: Modern DOM APIs

Use modern DOM methods.

| Rule                                | Violations | Fix                                       |
| ----------------------------------- | ---------- | ----------------------------------------- |
| `unicorn/prefer-add-event-listener` | 1          | Use `addEventListener()`                  |
| `unicorn/prefer-dom-node-append`    | 1          | Use `append()` instead of `appendChild()` |
| `unicorn/prefer-dom-node-dataset`   | 2          | Use `dataset` instead of `setAttribute("data-*")` |

### Phase 4f: Control flow and scoping

Improve control flow and function scoping.

| Rule                                  | Violations | Fix                          |
| ------------------------------------- | ---------- | ---------------------------- |
| `unicorn/no-lonely-if`                | 5          | Combine nested if conditions           |
| `unicorn/consistent-function-scoping` | 1          | Move function to outer scope           |
| `unicorn/explicit-length-check`       | 1          | Use `length > 0` instead of `length`   |

### Phase 4g: Type and comparison improvements

Cleaner type checks and comparisons.

| Rule                                       | Violations | Fix                                     |
| ------------------------------------------ | ---------- | --------------------------------------- |
| `unicorn/no-typeof-undefined`              | 1          | Use `=== undefined` instead of `typeof` |
| `unicorn/consistent-existence-index-check` | 1          | Consistent `!== -1` vs `>= 0`           |
| `unicorn/prefer-native-coercion-functions` | 3          | Use `String`/`Number` directly          |

### Phase 4h: Error handling

Improve error messages.

| Rule                    | Violations | Fix                              |
| ----------------------- | ---------- | -------------------------------- |
| `unicorn/error-message` | 1          | Add message to Error constructor |

### Phase 4i: TypeScript rules

Fix TypeScript-specific issues.

| Rule                                                 | Violations | Fix                                           |
| ---------------------------------------------------- | ---------- | --------------------------------------------- |
| `typescript/no-misused-promises`                     | 13         | Wrap async Discord event handlers (see below) |
| `typescript/prefer-nullish-coalescing`               | 7          | Use `??` instead of `\|\|` for nullish checks |
| `typescript/prefer-optional-chain`                   | 3          | Use `?.` optional chaining                    |
| `typescript/prefer-includes`                         | 2          | Use `includes()` instead of `indexOf()`       |
| `typescript/no-unnecessary-template-expression`      | 2          | Remove unnecessary template expressions       |
| `typescript/no-unnecessary-boolean-literal-compare`  | 2          | Simplify boolean comparisons                  |
| `typescript/no-non-null-asserted-nullish-coalescing` | 2          | Remove redundant `!` with `??`                |
| `typescript/no-misused-spread`                       | 2          | Fix incorrect spread usage                    |
| `typescript/require-array-sort-compare`              | 1          | Add compare function to sort()                |
| `promise/catch-or-return`                            | 8          | Add `void` before fire-and-forget promises    |
| `require-await`                                      | 12         | Remove `async` from functions that only return promises |

**Fix for `no-misused-promises`:** Different approaches depending on context:

1. **Discord daemon (`discord.ts`):** Create a `wrapHandler` helper that catches errors and triggers daemon restart:

   ```typescript
   let rejectHandler: (error: unknown) => void;
   const handlerFailure = new Promise<never>((_, rej) => {
     rejectHandler = rej;
   });
   const wrapHandler = <T extends unknown[]>(
     fn: (...args: T) => Promise<void>,
   ): ((...args: T) => void) => {
     return (...args: T) => {
       fn(...args).catch(rejectHandler);
     };
   };

   // Wrap event handlers and add handlerFailure to Promise.race calls
   ```

2. **Express handlers (`assets.ts`):** Wrap async callbacks in void IIFEs:

   ```typescript
   req.on("end", () => {
     void (async () => {
       try {
         /* ... */
       } catch (err) {
         next(err);
       }
     })();
   });
   ```

3. **Intentionally unhandled (`garbage-collection.ts`):** Suppress with comment when the async rejection is intentional (e.g. triggering process abort):

   ```typescript
   // oxlint-disable-next-line typescript/no-misused-promises -- intentionally unhandled
   ```

**Note on `prefer-nullish-coalescing`:** Not all `||` can be replaced with `??`. When the left operand is boolean and `false` should fall through to the next operand (e.g. in search filter chains like `name.includes(key) || email.includes(key)`), use `(?? false) ||` to preserve semantics. When `false` intentionally should not fall through (e.g. `value || default`), suppress with:

```typescript
// oxlint-disable-next-line typescript/prefer-nullish-coalescing -- false should fall through
```

### Phase 4j: Deprecations

Fix deprecated API usages. (`findOne` is allowed via `no-deprecated` configuration and does not need fixing.)

| Deprecated API             | Violations | Fix                                         |
| -------------------------- | ---------- | ------------------------------------------- |
| `fixedWidth` (FontAwesome) | 52         | Update to new FontAwesome API               |
| `ComponentRef<T>` (React)  | 7          | Use `React.ComponentRef<T>` or updated type |
| `RefObject` (React)        | 5          | Use `React.RefObject` or updated type       |
| `pulse` (FontAwesome)      | 1          | Use replacement animation prop              |
| `scrolling` (HTML)         | 1          | Use CSS overflow instead                    |

### Phase 4k: Oxc rules

Fix oxc plugin issues and any new violations introduced by earlier phases.

| Rule                            | Violations | Fix                                                                             |
| ------------------------------- | ---------- | ------------------------------------------------------------------------------- |
| `oxc/no-accumulating-spread`    | 1          | Use `Object.assign` instead of spread in loop                                   |
| `unicorn/prefer-array-flat-map` | 1          | Use `.flatMap()` (introduced by Phase 4a converting reduce+concat to map+flat)  |
| `unicorn/no-new-array`          | 2          | Use `Array.from({ length })` (introduced by Phase 4d adding `new` to `Array()`) |

> **Note:** Phases 4a and 4d can introduce new violations caught here. Consider going directly to `.flatMap()` in 4a and `Array.from({ length })` in 4d to avoid this.

---

## Phase 5: Remove Biome

**Goal:** Clean up biome configuration and dependencies.

### Tasks

1. Remove biome package:

   ```bash
   meteor npm uninstall @biomejs/biome
   ```

2. Re-install dependencies (`npm uninstall` may prune transitive deps like `oxlint-tsgolint`):

   ```bash
   meteor npm install
   ```

3. Delete biome configuration:

   ```bash
   rm biome.jsonc
   ```

4. Verify no remaining `biome-ignore` comments:

   ```bash
   grep -r "biome-ignore" --include="*.ts" --include="*.tsx" --include="*.js" .
   ```

   Any remaining comments should have been migrated or removed in Phase 2a.

5. Update `package.json`:
   - Remove any remaining biome-related scripts
   - Ensure lint scripts use oxlint/oxfmt

6. Update documentation:
   - Update `CLAUDE.md` / `CLAUDE.local.md` to reference oxlint/oxfmt
   - Update any contributor documentation

7. Delete this migration plan document:
   ```bash
   rm OXLINT_MIGRATION.md
   ```

---

## Configuration Files

### Final `.oxlintrc.json`

Rules are organized by plugin. Within each plugin, rules are alphabetically sorted.

Note: Despite the `.json` extension, oxlint supports comments in `.oxlintrc.json`. The section-heading comments below should be preserved in the actual file.

```json
{
  "$schema": "https://raw.githubusercontent.com/oxc-project/oxlint/main/npm/oxlint/configuration_schema.json",
  "plugins": [
    "react",
    "react-perf",
    "import",
    "jsx-a11y",
    "promise",
    "node",
    "unicorn",
    "typescript",
    "oxc"
  ],
  "ignorePatterns": ["eslint/**", "private/**"],
  "categories": {
    "correctness": "error",
    "suspicious": "error"
  },
  "rules": {
    // ── ESLint core ─────────────────────────────────────────────────────
    "array-callback-return": "error",
    "default-case-last": "error",
    "default-param-last": "error",
    "eqeqeq": ["error", "smart"],
    "grouped-accessor-pairs": "error",
    "guard-for-in": "error",
    "no-accumulating-spread": "error",
    "no-alert": "warn",
    "no-console": "warn",
    "no-constructor-return": "error",
    "no-fallthrough": "error",
    "no-lone-blocks": "error",
    "no-loop-func": "error",
    "no-new-wrappers": "error",
    "no-object-constructor": "error",
    "no-param-reassign": "error",
    "no-promise-executor-return": "error",
    "no-prototype-builtins": "error",
    "no-restricted-imports": [
      "warn",
      {
        "paths": [
          {
            "name": "react-bootstrap",
            "message": "Import from 'react-bootstrap/Component' instead to reduce bundle size."
          },
          {
            "name": "@fortawesome/free-solid-svg-icons",
            "message": "Import from '@fortawesome/free-solid-svg-icons/IconName' instead to reduce bundle size."
          }
        ],
        "patterns": [
          {
            "group": ["react-bootstrap/esm/*"],
            "message": "Import from 'react-bootstrap/Component' instead of 'react-bootstrap/esm/Component'."
          }
        ]
      }
    ],
    "no-return-assign": "error",
    "no-self-compare": "error",
    "no-template-curly-in-string": "error",
    "no-this-alias": "off",
    "no-throw-literal": "error",
    "no-unused-vars": [
      "error",
      { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }
    ],
    "no-useless-computed-key": "error",
    "no-useless-return": "error",
    "no-var": "warn",
    "prefer-array-find": "error",
    "prefer-exponentiation-operator": "error",
    "prefer-object-has-own": "error",
    "prefer-object-spread": "error",
    "prefer-rest-params": "error",
    "prefer-template": "error",
    "require-await": "error",
    "symbol-description": "error",

    // ── React ───────────────────────────────────────────────────────────
    "react/button-has-type": "error",
    "react/exhaustive-deps": ["error", { "additionalHooks": "useTracker" }],
    "react/jsx-boolean-value": "error",
    "react/jsx-curly-brace-presence": "error",
    "react/jsx-fragments": "error",
    "react/jsx-no-script-url": "error",
    "react/jsx-no-target-blank": "error",
    "react/jsx-no-useless-fragment": "error",
    "react/no-unescaped-entities": "error",
    "react/no-unknown-property": "error",
    "react/react-in-jsx-scope": "off",
    "react/rules-of-hooks": "error",
    "react/self-closing-comp": "error",

    // ── JSX-a11y ────────────────────────────────────────────────────────
    "jsx-a11y/alt-text": "error",
    "jsx-a11y/anchor-is-valid": "error",
    "jsx-a11y/click-events-have-key-events": "error",
    "jsx-a11y/heading-has-content": "error",
    "jsx-a11y/html-has-lang": "error",
    "jsx-a11y/iframe-has-title": "error",
    "jsx-a11y/iframe-missing-sandbox": "error",
    "jsx-a11y/media-has-caption": "off",
    "jsx-a11y/no-autofocus": "off",
    "jsx-a11y/no-noninteractive-tabindex": "error",
    "jsx-a11y/no-redundant-roles": "error",
    "jsx-a11y/role-has-required-aria-props": "error",

    // ── Import ──────────────────────────────────────────────────────────
    "import/default": "off",
    "import/no-named-as-default": "off",
    "import/no-named-as-default-member": "off",
    "import/no-self-import": "error",
    "import/no-unassigned-import": "off",

    // ── Promise ─────────────────────────────────────────────────────────
    "promise/always-return": "off",
    "promise/catch-or-return": "error",
    "promise/no-callback-in-promise": "off",
    "promise/no-multiple-resolved": "error",
    "promise/no-promise-in-callback": "off",

    // ── Node ──────────────────────────────────────────────────────────
    "node/no-new-require": "error",

    // ── Unicorn ─────────────────────────────────────────────────────────
    "unicorn/consistent-assert": "error",
    "unicorn/consistent-date-clone": "error",
    "unicorn/consistent-empty-array-spread": "error",
    "unicorn/consistent-existence-index-check": "error",
    "unicorn/error-message": "error",
    "unicorn/escape-case": "error",
    "unicorn/explicit-length-check": "error",
    "unicorn/new-for-builtins": "error",
    "unicorn/no-accessor-recursion": "error",
    "unicorn/no-console-spaces": "error",
    "unicorn/no-hex-escape": "error",
    "unicorn/no-immediate-mutation": "error",
    "unicorn/no-instanceof-array": "error",
    "unicorn/no-instanceof-builtins": "error",
    "unicorn/no-length-as-slice-end": "error",
    "unicorn/no-lonely-if": "error",
    "unicorn/no-negation-in-equality-check": "error",
    "unicorn/no-nested-ternary": "off",
    "unicorn/no-new-array": "error",
    "unicorn/no-new-buffer": "error",
    "unicorn/no-object-as-default-parameter": "error",
    "unicorn/no-static-only-class": "error",
    "unicorn/no-this-assignment": "error",
    "unicorn/no-typeof-undefined": "error",
    "unicorn/no-unnecessary-array-flat-depth": "error",
    "unicorn/no-unnecessary-array-splice-count": "error",
    "unicorn/no-unnecessary-slice-end": "error",
    "unicorn/no-unreadable-iife": "error",
    "unicorn/no-useless-promise-resolve-reject": "error",
    "unicorn/no-useless-switch-case": "error",
    "unicorn/no-zero-fractions": "error",
    "unicorn/prefer-array-flat": "error",
    "unicorn/prefer-array-flat-map": "error",
    "unicorn/prefer-array-some": "error",
    "unicorn/prefer-at": "error",
    "unicorn/prefer-blob-reading-methods": "error",
    "unicorn/prefer-class-fields": "error",
    "unicorn/prefer-code-point": "error",
    "unicorn/prefer-date-now": "error",
    "unicorn/prefer-default-parameters": "error",
    "unicorn/prefer-dom-node-append": "error",
    "unicorn/prefer-dom-node-dataset": "error",
    "unicorn/prefer-dom-node-remove": "error",
    "unicorn/prefer-dom-node-text-content": "error",
    "unicorn/prefer-includes": "error",
    "unicorn/prefer-logical-operator-over-ternary": "error",
    "unicorn/prefer-math-min-max": "error",
    "unicorn/prefer-math-trunc": "error",
    "unicorn/prefer-modern-dom-apis": "error",
    "unicorn/prefer-native-coercion-functions": "error",
    "unicorn/prefer-negative-index": "error",
    "unicorn/prefer-node-protocol": "error",
    "unicorn/prefer-object-from-entries": "error",
    "unicorn/prefer-optional-catch-binding": "error",
    "unicorn/prefer-prototype-methods": "error",
    "unicorn/prefer-query-selector": "error",
    "unicorn/prefer-regexp-test": "error",
    "unicorn/prefer-set-has": "error",
    "unicorn/prefer-string-replace-all": "error",
    "unicorn/prefer-string-slice": "error",
    "unicorn/prefer-string-trim-start-end": "error",
    "unicorn/prefer-structured-clone": "error",
    "unicorn/prefer-top-level-await": "error",
    "unicorn/prefer-type-error": "error",
    "unicorn/require-array-join-separator": "error",
    "unicorn/require-post-message-target-origin": "error",
    "unicorn/text-encoding-identifier-case": "error",
    "unicorn/throw-new-error": "error",

    // ── TypeScript ──────────────────────────────────────────────────────
    "typescript/adjacent-overload-signatures": "error",
    "typescript/await-thenable": "error",
    "typescript/ban-ts-comment": "error",
    "typescript/ban-tslint-comment": "error",
    "typescript/consistent-assert": "error",
    "typescript/consistent-type-imports": [
      "error",
      { "disallowTypeAnnotations": false }
    ],
    "typescript/no-base-to-string": "error",
    "typescript/no-confusing-non-null-assertion": "error",
    "typescript/no-confusing-void-expression": "off",
    "typescript/no-deprecated": ["error", { "allow": ["findOne"] }],
    "typescript/no-empty-interface": "error",
    "typescript/no-extraneous-class": "error",
    "typescript/no-floating-promises": "error",
    "typescript/no-for-in-array": "error",
    "typescript/no-implied-eval": "error",
    "typescript/no-meaningless-void-operator": "error",
    "typescript/no-misused-promises": "error",
    "typescript/no-mixed-enums": "error",
    "typescript/no-non-null-asserted-nullish-coalescing": "error",
    "typescript/no-redundant-type-constituents": "error",
    "typescript/no-unnecessary-boolean-literal-compare": "error",
    "typescript/no-unnecessary-type-arguments": "error",
    "typescript/no-unnecessary-type-assertion": "error",
    "typescript/no-unnecessary-type-constraint": "error",
    "typescript/no-unsafe-enum-comparison": "error",
    "typescript/no-unsafe-function-type": "error",
    "typescript/no-unsafe-type-assertion": "off",
    "typescript/only-throw-error": "error",
    "typescript/prefer-enum-initializers": "off",
    "typescript/prefer-for-of": "error",
    "typescript/prefer-function-type": "error",
    "typescript/prefer-includes": "error",
    "typescript/prefer-literal-enum-member": "error",
    "typescript/prefer-nullish-coalescing": "error",
    "typescript/prefer-optional-chain": "error",
    "typescript/prefer-promise-reject-errors": "error",
    "typescript/prefer-ts-expect-error": "error",
    "typescript/related-getter-setter-pairs": "error",
    "typescript/require-await": "error",
    "typescript/restrict-plus-operands": "error",
    "typescript/restrict-template-expressions": "off",
    "typescript/return-await": "error",
    "typescript/unbound-method": "error",

    // ── Oxc ─────────────────────────────────────────────────────────────
    "oxc/approx-constant": "error",
    "oxc/bad-array-method-on-arguments": "error",
    "oxc/bad-bitwise-operator": "error",
    "oxc/bad-char-at-comparison": "error",
    "oxc/bad-comparison-sequence": "error",
    "oxc/bad-min-max-func": "error",
    "oxc/bad-object-literal-comparison": "error",
    "oxc/bad-replace-all-arg": "error",
    "oxc/const-comparisons": "error",
    "oxc/double-comparisons": "error",
    "oxc/erasing-op": "error",
    "oxc/misrefactored-assign-op": "error",
    "oxc/missing-throw": "error",
    "oxc/no-async-endpoint-handlers": "error",
    "oxc/no-map-spread": "error",
    "oxc/no-this-in-exported-function": "error",
    "oxc/number-arg-out-of-range": "error",
    "oxc/only-used-in-recursion": "error",
    "oxc/uninvoked-array-callback": "error"
  },
  "overrides": [
    {
      "files": ["tests/**"],
      "rules": {
        "unicorn/consistent-function-scoping": "off"
      }
    },
    {
      "files": ["types/**/*.d.ts"],
      "rules": {
        "typescript/no-empty-interface": "off",
        "unicorn/require-module-specifiers": "off"
      }
    },
    {
      "files": ["imports/client/components/Routes.tsx"],
      "rules": {
        "oxc/no-map-spread": "off"
      }
    },
    {
      "files": ["imports/lib/throttle.ts"],
      "rules": {
        "unicorn/no-this-assignment": "off"
      }
    }
  ]
}
```

### Final `.oxfmtrc.json`

```json
{
  "$schema": "./node_modules/oxfmt/configuration_schema.json",
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false,
  "trailingComma": "all",
  "arrowParens": "always",
  "endOfLine": "lf",
  "bracketSpacing": true,
  "experimentalSortImports": {
    "groups": ["builtin", "meteor", "external", ["parent", "sibling", "index"]],
    "customGroups": [
      {
        "groupName": "meteor",
        "elementNamePattern": ["meteor/"]
      }
    ],
    "newlinesBetween": true
  },
  "ignorePatterns": ["node_modules/**", ".meteor/**", "eslint/**", "private/**"]
}
```

---

## Rollback Plan

If issues are discovered after any phase:

1. **Phase 2 rollback:** Re-enable biome linter in `biome.jsonc`, revert script changes
2. **Phase 3 rollback:** `git revert` the formatting commit, re-enable biome formatter
3. **Phase 4 rollback:** Revert the problematic fix commit
4. **Phase 5 rollback:** `meteor npm install @biomejs/biome`, restore `biome.jsonc` from git history

---

## References

- [Oxlint Documentation](https://oxc.rs/docs/guide/usage/linter.html)
- [Oxfmt Documentation](https://oxc.rs/docs/guide/usage/formatter.html)
- [GitHub Issue #2697](https://github.com/deathandmayhem/jolly-roger/issues/2697) - Original investigation
