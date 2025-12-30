import noDisallowedSyncMethods from "./rules/no-disallowed-sync-methods";

export default {
  meta: {
    name: "eslint-plugin-jolly-roger",
  },
  rules: {
    "no-disallowed-sync-methods": noDisallowedSyncMethods,
  },
};
