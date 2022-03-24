import Migrations from './Migrations';

Migrations.add({
  version: 13,
  name: 'Add indexes for viewing profiles by display name',
  up() {
    // This migration was (incorrectly) used for the DocumentPermissions model, which has
    // since been removed.
  },
});
