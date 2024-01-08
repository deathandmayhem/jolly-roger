import Migrations from "./Migrations";

Migrations.add({
  version: 11,
  name: "Add indexes for API keys",
  async up() {
    // This migration previously created indexes, which is now handled
    // declaratively
  },
});
