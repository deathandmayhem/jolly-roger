import Migrations from "./Migrations";

Migrations.add({
  version: 1,
  name: "Add basic indexes to collections",
  async up() {
    // This migration previously created indexes, which is now handled
    // declaratively
  },
});
