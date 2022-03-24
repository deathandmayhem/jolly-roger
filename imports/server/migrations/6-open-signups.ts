import Hunts from '../../lib/models/Hunts';
import Migrations from './Migrations';

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
