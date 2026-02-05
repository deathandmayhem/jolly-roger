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
            rule.selectors = rule.selectors
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
          });
        }

        // Hoist @layer blocks nested inside style rules (e.g. daisyUI components)
        // so they become valid @scope > @layer > rule structures
        hoistNestedLayers(scope);
      },
    },
  };
};
module.exports.postcss = true;
