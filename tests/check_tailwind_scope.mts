/**
 * Verify the scope-tailwind postcss plugin against the real Tailwind/daisyUI
 * pipeline: compile the app stylesheet and assert that the output upholds the
 * invariants the Bootstrap/Tailwind coexistence scheme depends on. The plugin
 * string-matches selector shapes emitted by Tailwind and daisyUI internals, so
 * an upstream upgrade could silently break scoping; this catches that.
 */
import { promises as fs } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/postcss";
import postcss from "postcss";

const require = createRequire(import.meta.url);
const scopeTailwind = require("../postcss/scope-tailwind.js") as (
  opts?: unknown,
) => postcss.Plugin;

const dirname = path.dirname(fileURLToPath(import.meta.url));
const stylesheet = path.join(
  dirname,
  "../imports/client/stylesheets/tailwind.css",
);

const SCOPED_LAYERS = new Set(["base", "components", "utilities", "overrides"]);
const SCOPE_PARAMS = "(.tailwind-page) to (.bootstrap-page)";

// Selectors that target the document root or document element. Inside @scope
// they can never match, so any occurrence means the plugin failed to rewrite
// (base layer) or hoist (other layers) them.
function targetsDocumentRoot(selector: string): boolean {
  return (
    selector.includes(":root") ||
    selector.includes(":host") ||
    selector === "html" ||
    selector.startsWith("html:") ||
    selector.startsWith("html ") ||
    selector.startsWith("html,")
  );
}

const main = async () => {
  const css = await fs.readFile(stylesheet, "utf8");
  const result = await postcss([tailwindcss(), scopeTailwind()]).process(css, {
    from: stylesheet,
    map: false,
  });
  const root = postcss.parse(result.css);

  const errors: string[] = [];
  let sawScope = false;
  let sawScrollLockProducer = false;

  root.each((node) => {
    if (node.type === "atrule" && node.name === "layer") {
      if (!SCOPED_LAYERS.has(node.params)) return;
      // Every child of a scoped layer must be an @scope wrapper
      node.each((child) => {
        if (
          child.type !== "atrule" ||
          child.name !== "scope" ||
          child.params !== SCOPE_PARAMS
        ) {
          errors.push(
            `@layer ${node.params} contains an unscoped ${child.type === "rule" ? child.selector : `@${(child as postcss.AtRule).name}`}`,
          );
          return;
        }
        sawScope = true;
        child.walkRules((rule) => {
          for (const selector of rule.selectors) {
            if (targetsDocumentRoot(selector)) {
              errors.push(
                `@layer ${node.params} contains a document-root selector that can never match inside @scope: ${selector}`,
              );
            }
            if (selector.trim() === "") {
              errors.push(`@layer ${node.params} contains an empty selector`);
            }
          }
        });
      });
    } else if (node.type === "rule" && node.selector.startsWith(":root:has(")) {
      // The hoisted daisyUI modal scroll-lock producer, consumed by the :root
      // rule in tailwind.css
      node.walkDecls("--page-scroll-lock", () => {
        sawScrollLockProducer = true;
      });
    }
  });

  // daisyUI relies on @layer nested directly under another @layer, which
  // browsers accept; @layer nested inside a style rule is silently ignored,
  // so hoistNestedLayers must have eliminated every occurrence
  root.walkRules((rule) => {
    for (const child of rule.nodes ?? []) {
      if (child.type === "atrule" && child.name === "layer") {
        errors.push(
          `style rule ${rule.selector} contains a nested @layer, which browsers ignore`,
        );
      }
    }
  });

  if (!sawScope) {
    errors.push("no @scope wrappers found; did the plugin run at all?");
  }
  if (!sawScrollLockProducer) {
    errors.push(
      "no hoisted :root:has() rule setting --page-scroll-lock found; modal scroll locking is broken",
    );
  }

  if (errors.length > 0) {
    process.stderr.write("Tailwind scoping check failed:\n");
    for (const error of errors) {
      process.stderr.write(`  ${error}\n`);
    }
    process.exit(1);
  }

  process.exit(0);
};

await main();
