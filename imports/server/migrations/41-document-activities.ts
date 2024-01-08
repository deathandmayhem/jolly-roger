import Migrations from "./Migrations";

Migrations.add({
  version: 41,
  name: "Add document activities collections and indexes",
  async up() {
    // This migration previously created indexes, which is now handled
    // declaratively
  },
});
