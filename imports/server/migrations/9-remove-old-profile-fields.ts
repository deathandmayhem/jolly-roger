import { Migrations } from 'meteor/percolate:migrations';

Migrations.add({
  version: 9,
  name: 'Remove deprecated profile fields',
  up() {
    // This migration was used for the Profiles model, which has since been
    // removed.
  },
});
