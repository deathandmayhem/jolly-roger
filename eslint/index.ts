import noDisallowedSyncMethods from "./rules/no-disallowed-sync-methods";

const { name } = require("./package.json") as typeof import("./package.json");

export = {
  meta: {
    name,
  },
  rules: {
    "no-disallowed-sync-methods": noDisallowedSyncMethods,
  },
};
