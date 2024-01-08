import Migrations from "./Migrations";

Migrations.add({
  version: 34,
  name: "Add indexes to mediasoup collections",
  async up() {
    // This migration previously created indexes, which is now handled
    // declaratively
  },
});
