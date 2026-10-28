---
files:
  - imports/client/browserSupport.ts
  - imports/client/i18n.ts
  - rspack.config.js
  - tsconfig.client.json
updated: 2026-10-27
---

# Browser Support

Today, Jolly Roger supports browsers from roughly mid-2023 or newer. The newest
feature that we currently use is `Array.prototype.toSorted` (from ES2023). This
means that we currently support Chrome and Edge >= 110, Firefox >= 115, and
Safari >= 16 (including on iOS), although those exact versions are derived from
the features we care about, and are not binding on their own.

Rather than rely on polyfills and other backwards-compatibility, this browser
support cutoff manifests in two ways:

* To prevent older browsers from having a bad time, we enforce a floor in the
  client bundle load. If a browser does not support the newest features that we
  depend on, it throws an error page and stops the rest of the app from loading
  (and, presumably, having a bad time).
* To prevent us from accidentally introducing newer features, we enforce a
  ceiling in our TypeScript (for checking built-ins) and Rspack (for checking
  syntax) configurations.

## Testing the Floor

We intentionally load `imports/client/browserSupport.ts` as the very first thing
in the client bundle. Because it's being displayed to browsers that we don't
support, it should have a significantly lower floor than the rest of the app. In
practice, because the browser still has to parse the compiled bundle which uses
private class methods, `?.`, etc., the app will still break (show a blank
screen) on anything older than (roughly) Chrome 84, Firefox 90, or Safari 15.

Since this is client-facing, we do support i18n for the text, but using a
separate instance of the `i18next` library to limit third-party dependencies.
(And because we can't show the actual app, they won't have access to a UI
language switcher, so it'll be dependent on browser locale settings). Changes to
either i18n configuration probably will need to be reflected in both places.

## Linting the Ceiling

Two mechanisms enforce that we don't unintentionally move forward our version
support cutoff:

* **In the `tsc` config**: `tsconfig.client.json` specifies which language
  built-ins are supported in the code via the `lib` directive. Using newer
  features fails typechecking.
* **In the `rspack` config**: `rspack.config.js` configures
  `@rsbuild/plugin-check-syntax` which checks the emitted client bundle for
  language syntax that's newer than the specified version. (Unfortunately,
  because the dev server doesn't materialize the bundle to disk, it only runs in
  test and CI. And because both we and Meteor ship some packages as externals,
  those don't get inspected either.)

In both cases, we mostly set our ceiling to ES2022 - Firefox didn't gain
complete support for ES2023 until near the end of 2025 - with a few additional
ES2023 features (array methods) that we currently use.

Currently missing from the linting configuration is DOM API support.
TypeScript's libraries issue different releases for builtins, but not for the
DOM API, and no linter that we can easily deploy currently covers it. Hopefully
Oxlint will eventually grow coverage ([oxc#27384][]).

## Raising the Bar

In order to change the oldest acceptable version, change all three places that
currently check:

* `imports/client/browserSupport.ts`: Update the runtime check to the newest
  feature that you want to depend on
* `tsconfig.client.json`: Change the `lib` directive to match the browsers that
  support that feature
* `rspack.config.js`: Update the `ecmaVersion` as needed (or possible) to
  support newer syntax.

## Gaps

Because these specifiers are all in terms of standards, they don't necessarily
align exactly with browser support. A few specific things that will pass linting
but aren't actually supported by our nominal floor:

* `Intl.Segmenter` is part of ES2022, but wasn't supported by Firefox until
  v125. We feature-detect that instead of dropping it.
* Class static blocks aren't supported until Safari v16.4 (although we don't
  currently use those).
* Regex lookbehind (`(?<=...)` and `(?<!...)`) is ES2018, but isn't supported
  until Safari v16.4 (although we don't currently use it in regex literals).

[oxc#27384]: https://github.com/oxc-project/oxc/issues/27384
