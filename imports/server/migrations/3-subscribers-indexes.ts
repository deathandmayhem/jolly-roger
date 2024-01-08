import Migrations from "./Migrations";

Migrations.add({
  version: 3,
  name: "Add indexes for subscriber tracking",
  async up() {
    // This migration previously created indexes, which is now handled
    // declaratively
  },
});
