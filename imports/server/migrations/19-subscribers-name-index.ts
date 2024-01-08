import Migrations from "./Migrations";

Migrations.add({
  version: 19,
  name: "Create new index for subscribers.fetch subscription",
  async up() {
    // This migration previously created indexes, which is now handled
    // declaratively
  },
});
