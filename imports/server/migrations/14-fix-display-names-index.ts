import { Migrations } from 'meteor/percolate:migrations';

Migrations.add({
  version: 14,
  name: 'Add correct indexes for viewing profiles by display name',
  up() {
    // This migration was used for the Profiles model, which has since been
    // removed.
  },
});
