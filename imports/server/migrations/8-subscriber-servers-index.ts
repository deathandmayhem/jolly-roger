import Migrations from "./Migrations";

Migrations.add({
  version: 8,
  name: "Add index for subscriptions server tracker",
  async up() {
    // This migration previously created indexes, which is now handled
    // declaratively
  },
});
