import Migrations from "./Migrations";

Migrations.add({
  version: 47,
  name: "Add unique indexes to DiscordRoleGrants",
  async up() {
    // This migration previously created an index, which is now handled
    // declaratively
  },
});
