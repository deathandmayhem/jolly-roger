import { Migrations } from 'meteor/percolate:migrations';

Migrations.add({
  version: 30,
  name: 'Add indexes on CallParticipants',
  up() {
    // This migration was used for the CallParticipants model, which has since
    // been removed.
  },
});
