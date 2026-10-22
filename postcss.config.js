// postcss-loader resolves string plugin names relative to its own directory
// under node_modules, so we pass plugin instances instead.
const tailwindcss = require("@tailwindcss/postcss");
const scopeTailwind = require("./postcss/scope-tailwind");

module.exports = {
  plugins: [tailwindcss(), scopeTailwind()],
};
