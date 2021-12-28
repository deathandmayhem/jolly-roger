import { Migrations } from 'meteor/percolate:migrations';

Migrations.add({
  version: 31,
  name: 'Add indexes on CallSignals',
  up() {
    // This migration was used for the CallSignals model, which has since
    // been removed.
  },
});
