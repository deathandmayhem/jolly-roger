import { Migrations } from 'meteor/percolate:migrations';
import Hunts from '../../lib/models/hunts';

Migrations.add({
  version: 6,
  name: 'Backfill new open signups property on hunts',
  up() {
    Hunts.update(
      <any>{ openSignups: null },
      { $set: { openSignups: false } },
      { multi: true },
    );
  },
});
