import { Migrations } from 'meteor/percolate:migrations';
import Hunts from '../../lib/models/hunts.js';

Migrations.add({
  version: 6,
  name: 'Backfill new open signups property on hunts',
  up() {
    Hunts.update(
      { openSignups: null },
      { $set: { openSignups: false } },
      { multi: true },
    );
  },
});
