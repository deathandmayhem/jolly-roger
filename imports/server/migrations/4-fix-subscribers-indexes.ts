import Migrations from "./Migrations";

Migrations.add({
  version: 4,
  name: "Fix indexes for subscriber tracking",
  async up() {
    // This migration previously created indexes, which is now handled
    // declaratively
  },
});
