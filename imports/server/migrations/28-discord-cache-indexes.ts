import Migrations from "./Migrations";

Migrations.add({
  version: 28,
  name: "Create index for discord cache",
  async up() {
    // This migration previously created indexes, which is now handled
    // declaratively
  },
});
