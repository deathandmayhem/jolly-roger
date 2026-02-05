const postcss = require("postcss");

// daisyUI nests @layer inside style rules (e.g. `.badge { @layer daisyui.l1.l2.l3 { ... } }`)
// for cascade ordering. CSS nesting does not allow @layer inside style rules, but browsers
// handle the pattern when @layer is a direct child of another @layer. Adding an @scope wrapper
// in between breaks this, so we hoist the nested @layer out: the style rule moves inside the
// @layer, producing valid `@scope > @layer > .rule` nesting.
function hoistNestedLayers(scope) {
  // Repeat until no more @layer-in-rule patterns exist, since hoisting can create
  // new rules that themselves contain @layer children (from deeply nested structures)
  let changed = true;
  while (changed) {
    changed = false;

    // Collect all rules that have @layer children in a single pass
    const rulesToProcess = [];
    scope.walkRules((rule) => {
      for (const child of rule.nodes ?? []) {
        if (child.type === "atrule" && child.name === "layer") {
          rulesToProcess.push(rule);
          break;
        }
      }
    });

    for (const rule of rulesToProcess) {
      // Collect @layer children of this rule
      const layerChildren = [];
      rule.each((child) => {
        if (child.type === "atrule" && child.name === "layer") {
          layerChildren.push(child);
        }
      });

      for (const layerAtRule of layerChildren) {
        changed = true;

        // Create a clone of the rule to hold the declarations from this @layer
        const hoistedRule = rule.clone({ nodes: [] });

        // Move the @layer's children into the cloned rule
        while (layerAtRule.first) {
          hoistedRule.append(layerAtRule.first);
        }

        // Remove the now-empty @layer from the original rule
        layerAtRule.remove();

        // Place the @layer (now containing the rule) after the original rule's parent context
        // We insert before the original rule, then we'll clean up empty rules after
        const newLayer = postcss.atRule({
          name: "layer",
          params: layerAtRule.params,
        });
        newLayer.append(hoistedRule);
        rule.before(newLayer);
      }

      // If the original rule is now empty (all content was in @layer blocks), remove it
      if (rule.nodes.length === 0) {
        rule.remove();
      }
    }
  }
}

// The nearest ancestor style rule, skipping intermediate at-rules (@layer,
// @media, ...), or null if the rule is not nested inside another rule.
function nearestRuleAncestor(node) {
  let parent = node.parent;
  while (parent) {
    if (parent.type === "rule") return parent;
    if (parent.type === "root") return null;
    parent = parent.parent;
  }
  return null;
}

// The desugared form of a rule's selector list, for substituting into a
// nested descendant's `&` per the CSS nesting spec.
function desugaredSelector(rule) {
  const parent = nearestRuleAncestor(rule);
  const selectors = parent
    ? rule.selectors.map((sel) =>
        sel.includes("&")
          ? sel.replaceAll("&", desugaredSelector(parent))
          : `${desugaredSelector(parent)} ${sel}`,
      )
    : rule.selectors;
  return selectors.length === 1 ? selectors[0] : `:is(${selectors.join(", ")})`;
}

// Inside @scope, :root can never match: the document root is outside every
// scope. daisyUI still emits :root rules in its component layers, e.g. the
// modal scroll-lock producer (`:root:has(<open modal>) { --page-scroll-lock: ; }`).
// Those rules target the document root by design, so we hoist them out of the
// @scope wrapper entirely, desugaring `&` against the ancestor rules the same
// way CSS nesting would (`&` becomes `:is(<parent selector list>)`). The
// document-level consumer for --page-scroll-lock lives in tailwind.css.
function hoistRootRules(scope, topLayer) {
  const hoisted = [];
  scope.walkRules((rule) => {
    const rootSelectors = rule.selectors.filter((sel) =>
      sel.startsWith(":root"),
    );
    if (rootSelectors.length === 0) return;

    const parent = nearestRuleAncestor(rule);

    const newRule = rule.clone();
    newRule.selectors = rootSelectors.map((sel) => {
      if (sel.includes("&")) {
        return parent
          ? sel.replaceAll("&", desugaredSelector(parent))
          : sel.replaceAll("&", ":scope");
      }
      return sel;
    });
    hoisted.push(newRule);

    const remaining = rule.selectors.filter((sel) => !sel.startsWith(":root"));
    if (remaining.length === 0) {
      const emptyParent = rule.parent;
      rule.remove();
      // Clean up rules left empty by the removal
      let node = emptyParent;
      while (node?.type === "rule" && (node.nodes ?? []).length === 0) {
        const next = node.parent;
        node.remove();
        node = next;
      }
    } else {
      rule.selectors = remaining;
    }
  });

  for (const rule of hoisted) {
    topLayer.after(rule);
  }
}

module.exports = (opts = {}) => {
  const selector = opts.selector ?? ".tailwind-page";
  const boundary = opts.boundary ?? ".bootstrap-page";
  const layersToScope = new Set(["base", "components", "utilities"]);
  return {
    postcssPlugin: "postcss-scope-tailwind",
    AtRule: {
      layer(atRule) {
        if (!layersToScope.has(atRule.params)) return;

        const scope = postcss.atRule({
          name: "scope",
          params: `(${selector}) to (${boundary})`,
        });

        // Move all children into @scope
        while (atRule.first) {
          scope.append(atRule.first);
        }
        atRule.append(scope);

        // Transform selectors for the base layer (Preflight and daisyUI theme variables)
        // Inside @scope, selectors like :root, html, :host need to become :scope
        // to target the scope root element instead of the document root
        if (atRule.params === "base") {
          scope.walkRules((rule) => {
            const selectors = rule.selectors
              .map((sel) => {
                // Exact matches
                if (sel === "html" || sel === ":host" || sel === ":root") {
                  return ":scope";
                }
                // :where(:root) → :scope (drop the :where since :scope has no specificity anyway)
                if (sel === ":where(:root)") {
                  return ":scope";
                }
                // :where(:root, [data-theme]) → :scope (theme variable selector)
                if (sel === ":where(:root, [data-theme])") {
                  return ":scope";
                }
                // :root with modifiers like :root:has(...) → :scope:has(...)
                if (sel.startsWith(":root:")) {
                  return `:scope${sel.slice(5)}`;
                }
                // [data-theme=X] → :scope[data-theme=X] (theme selectors need to match scope root)
                if (/^\[data-theme[=\]]/.test(sel)) {
                  return `:scope${sel}`;
                }
                return sel;
              })
              .filter((sel) => sel !== "::backdrop");
            // Preflight has a lone ::backdrop rule; dropping its only
            // selector would leave an invalid empty selector list
            if (selectors.length === 0) {
              rule.remove();
            } else {
              rule.selectors = selectors;
            }
          });
        }

        // Hoist @layer blocks nested inside style rules (e.g. daisyUI components)
        // so they become valid @scope > @layer > rule structures
        hoistNestedLayers(scope);

        // Hoist :root rules (e.g. daisyUI's modal scroll-lock) out of the
        // scope so they can still match the document root
        hoistRootRules(scope, atRule);
      },
    },
  };
};
module.exports.postcss = true;
