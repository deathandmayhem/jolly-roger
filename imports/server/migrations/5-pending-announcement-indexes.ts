import Migrations from "./Migrations";

Migrations.add({
  version: 5,
  name: "Create indexes for pending announcements",
  async up() {
    // This migration previously created indexes, which is now handled
    // declaratively
  },
});
