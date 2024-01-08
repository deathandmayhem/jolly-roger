import Migrations from "./Migrations";

Migrations.add({
  version: 45,
  name: "Add permission level to FolderPermissions index",
  async up() {
    // This migration previously created indexes, which is now handled
    // declaratively
  },
});
