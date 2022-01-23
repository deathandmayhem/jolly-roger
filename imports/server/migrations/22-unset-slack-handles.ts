import { Migrations } from 'meteor/percolate:migrations';

Migrations.add({
  version: 22,
  name: 'Remove slackHandle from Profiles',
  up() {
    // This migration was used for the Profiles model, which has since been
    // removed.
  },
});
