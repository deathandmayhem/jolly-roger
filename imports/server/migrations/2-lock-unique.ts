import Migrations from "./Migrations";

Migrations.add({
  version: 2,
  name: "Add unique index to locks",
  async up() {
    // This migration previously created indexes, which is now handled
    // declaratively
  },
});
