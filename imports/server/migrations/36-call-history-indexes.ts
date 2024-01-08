import Migrations from "./Migrations";

Migrations.add({
  version: 36,
  name: "Add indexes to CallHistory collection",
  async up() {
    // This migration previously created indexes, which is now handled
    // declaratively
  },
});
